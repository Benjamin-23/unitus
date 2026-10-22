-- Rounds: chamas that run on any schedule, start with 2 members, and pay the
-- winner automatically.
--
--   * frequency: how often a round runs (30min is for sandbox testing only).
--   * starts_at: when the first round runs. A round needs at least 2 members
--     who have paid the joining fee; until then it waits.
--   * Members can join while the chama is running, up to member_limit.
--   * Each round draws a recipient at random from the members who haven't
--     received in the current cycle. Everyone else pays the contribution
--     (and everyone pays savings). A member doesn't pay into the round of
--     someone who received before they joined: they only pay the people who
--     will pay them back this cycle. A cycle ends when every member has
--     received once.
--   * The pot is paid out with PayPal Payouts and posted to the ledger.
--
-- Run after 0007 in the Supabase SQL Editor.

-- Schedule (set at creation, then locked like the other rules).
alter table public.chamas
  add column if not exists frequency text not null default 'monthly'
    check (frequency in ('30min', 'daily', '3days', 'weekly', '2weeks', 'monthly')),
  add column if not exists starts_at timestamptz;

-- Existing chamas start on their old deduction day (rules lock paused for this backfill only).
alter table public.chamas disable trigger chamas_lock_rules;
update public.chamas
  set starts_at = (start_month + (deduction_day - 1) * interval '1 day') at time zone 'UTC'
  where starts_at is null;
alter table public.chamas enable trigger chamas_lock_rules;

alter table public.chamas alter column starts_at set not null;

-- status: open = waiting for the first round · active = running · closed = wound up
comment on column public.chamas.status is 'open: first round not run yet · active: running · closed: wound up';

-- Where payouts go: PayPal's payer id, captured when the member first pays.
alter table public.members add column if not exists paypal_payer_id text;

create table if not exists public.chama_rounds (
  id               uuid primary key default gen_random_uuid(),
  chama_id         uuid not null references public.chamas (id),
  number           int not null check (number >= 1),
  cycle            int not null check (cycle >= 1),
  due_at           timestamptz not null,
  recipient_id     uuid not null references public.members (id),
  -- collecting: charging members · paying: payout sent · paid: payout done ·
  -- no_pot: nothing collected · payout_failed: PayPal refused the payout (pot stays)
  status           text not null default 'collecting'
    check (status in ('collecting', 'paying', 'paid', 'no_pot', 'payout_failed')),
  pot              numeric(12, 2),
  payout_batch_id  text,
  payout_item_id   text,
  payout_status    text,
  payout_fee       numeric(12, 2),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  unique (chama_id, number)
);

create index if not exists chama_rounds_status_idx on public.chama_rounds (status);

-- A round's deductions: contribution (to the pot) and savings, stored separately.
alter table public.payments
  add column if not exists round_id uuid references public.chama_rounds (id),
  add column if not exists contribution numeric(12, 2);

create unique index if not exists payments_round_member_idx on public.payments (round_id, member_id) where round_id is not null;

-- Payouts post once per round.
alter table public.ledger_transactions add column if not exists round_id uuid unique references public.chama_rounds (id);

-- create_chama stores the schedule. start_month / deduction_day are kept for older code.
create or replace function public.create_chama(p_member uuid, p_invite_code text, p_rules jsonb)
returns public.chamas
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
  starts timestamptz := (p_rules->>'startsAt')::timestamptz;
begin
  if not public.can_create_chama(p_member) then
    raise exception 'This PayPal account already takes part in a chama, so it can''t create one. Use a separate PayPal account to start a chama'
      using errcode = 'check_violation';
  end if;

  insert into public.chamas (
    name, description, invite_code, created_by, member_limit, start_month, monthly_contribution,
    monthly_savings, joining_fee, deduction_day, share_out, loan_multiplier, loan_interest_rate,
    frequency, starts_at
  ) values (
    p_rules->>'name', nullif(p_rules->>'description', ''), p_invite_code, p_member,
    (p_rules->>'memberLimit')::int, date_trunc('month', starts at time zone 'UTC')::date,
    (p_rules->>'monthlyContribution')::numeric, (p_rules->>'monthlySavings')::numeric,
    (p_rules->>'joiningFee')::numeric, least(extract(day from starts at time zone 'UTC')::int, 28), p_rules->>'shareOut',
    (p_rules->>'loanMultiplier')::int, (p_rules->>'loanInterestRate')::numeric,
    p_rules->>'frequency', starts
  ) returning * into c;
  return c;
end;
$$;

-- Joining is open until the chama is full or closed, including while it runs.
create or replace function public.join_chama(p_member uuid, p_invite_code text)
returns table (chama_id uuid, already_member boolean)
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
  taken int;
begin
  select * into c from public.chamas where invite_code = upper(p_invite_code) for update;
  if not found then
    raise exception 'No chama with that invite code' using errcode = 'no_data_found';
  end if;

  if c.created_by = p_member then
    raise exception 'The admin account can''t join its own chama. Log in with a different PayPal account to join'
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.chama_members m where m.chama_id = c.id and m.member_id = p_member) then
    return query select c.id, true;
    return;
  end if;

  if c.status = 'closed' then
    raise exception 'This chama is no longer accepting members' using errcode = 'check_violation';
  end if;

  select count(*) into taken from public.chama_members m where m.chama_id = c.id;
  if taken >= c.member_limit then
    raise exception 'This chama is full' using errcode = 'check_violation';
  end if;

  insert into public.chama_members (chama_id, member_id) values (c.id, p_member);
  return query select c.id, false;
end;
$$;

-- Payments now say how much of a deduction is contribution; the rest is savings.
create or replace function public.ledger_post_payment(p_order_id text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p public.payments;
  c public.chamas;
  tx uuid;
  net numeric;
  gap numeric;
  contribution numeric;
begin
  select * into p from public.payments where paypal_order_id = p_order_id;
  if not found or p.status <> 'COMPLETED' or p.chama_id is null or p.kind not in ('joining_fee', 'monthly_deduction') then
    return null;
  end if;

  select id into tx from public.ledger_transactions where payment_id = p.id;
  if found then
    return tx;
  end if;

  select * into c from public.chamas where id = p.chama_id;
  net := coalesce(p.net_amount, p.principal);
  gap := p.principal - net;

  insert into public.ledger_transactions (chama_id, payment_id, kind, description, member_id, gross_amount, fee_charged, paypal_fee, occurred_at)
  values (
    p.chama_id, p.id, p.kind,
    case
      when p.kind = 'joining_fee' then 'Joining fee'
      when p.round_id is not null then coalesce(p.reference, 'Round') || ' contribution'
      else 'Monthly contribution ' || coalesce(p.reference, '')
    end,
    p.member_id, p.amount, p.fee_charged, p.paypal_fee, p.created_at
  )
  returning id into tx;

  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('paypal_pool'), net);

  if p.kind = 'joining_fee' then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('member_joining_fee', p.chama_id, p.member_id), -p.principal);
  else
    contribution := coalesce(p.contribution, least(c.monthly_contribution, p.principal));
    if contribution > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('chama_pot', p.chama_id), -contribution);
    end if;
    if p.principal - contribution > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('member_savings', p.chama_id, p.member_id), -(p.principal - contribution));
    end if;
  end if;

  if gap <> 0 then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('unitus_operating'), gap);
  end if;

  return tx;
end;
$$;

-- Posts a round's payout once PayPal has sent it: the pot pays the recipient,
-- the money leaves the pool, and Unitus covers PayPal's payout fee.
create or replace function public.ledger_post_payout(p_round uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.chama_rounds;
  tx uuid;
  fee numeric;
begin
  select * into r from public.chama_rounds where id = p_round;
  if not found or coalesce(r.pot, 0) <= 0 then
    return null;
  end if;

  select id into tx from public.ledger_transactions where round_id = r.id;
  if found then
    return tx;
  end if;

  fee := coalesce(r.payout_fee, 0);
  insert into public.ledger_transactions (chama_id, round_id, kind, description, member_id, gross_amount, paypal_fee, occurred_at)
  values (r.chama_id, r.id, 'payout', 'Round ' || r.number || ' payout', r.recipient_id, r.pot, fee, coalesce(r.completed_at, now()))
  returning id into tx;

  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('chama_pot', r.chama_id), r.pot);
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('paypal_pool'), -(r.pot + fee));
  if fee > 0 then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('unitus_operating'), fee);
  end if;
  return tx;
end;
$$;

alter table public.chama_rounds enable row level security;
revoke execute on function public.ledger_post_payout(uuid) from public, anon, authenticated;
revoke execute on function public.ledger_post_payment(text) from public, anon, authenticated;
revoke execute on function public.create_chama(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_chama(uuid, text) from public, anon, authenticated;
