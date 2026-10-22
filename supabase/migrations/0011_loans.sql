-- Member loans: borrow from the chama's savings, repaid with each round.
--
--   * A member can borrow once they've saved in at least 4 rounds of that chama
--     (completed round payments with savings in them), haven't missed a round
--     payment since their first one, and have no other loan open (in any chama).
--   * Limit: 25% of their savings for the first loan, +5% for each loan repaid
--     without missing a round, up to the chama's multiplier (3× = 300%). Never
--     more than the chama holds in savings and joining fees that isn't already
--     lent out.
--   * Flat interest at the chama's rate. The loan is credited to the member's
--     Unitus wallet (withdraw it to PayPal from there).
--   * Repaid in instalments added to the member's round payments. Interest goes
--     to the chama's interest account, shared out with the savings.
--
--   Borrow     → request_loan: loan receivable +total, wallet −principal, interest −interest
--   Repayment  → ledger_post_payment: pool +net, …, loan receivable −instalment
--
-- Run after 0010 in the Supabase SQL Editor. Safe to run again.

alter table public.ledger_accounts drop constraint if exists ledger_accounts_kind_check;
alter table public.ledger_accounts add constraint ledger_accounts_kind_check
  check (kind in ('paypal_pool', 'unitus_operating', 'chama_pot', 'member_savings', 'member_joining_fee', 'member_wallet', 'member_loan', 'chama_interest'));

alter table public.ledger_transactions drop constraint if exists ledger_transactions_kind_check;
alter table public.ledger_transactions add constraint ledger_transactions_kind_check
  check (kind in ('joining_fee', 'monthly_deduction', 'payout', 'adjustment', 'pot_credit', 'withdrawal', 'withdrawal_fee', 'withdrawal_reversal', 'loan'));

create table if not exists public.loans (
  id             uuid primary key default gen_random_uuid(),
  chama_id       uuid not null references public.chamas (id),
  member_id      uuid not null references public.members (id),
  principal      numeric(12, 2) not null check (principal > 0),
  interest_rate  numeric(5, 2) not null,
  interest       numeric(12, 2) not null check (interest >= 0),
  total          numeric(12, 2) not null,
  instalments    int not null check (instalments between 1 and 12),
  -- Charged with each round until `repaid` reaches `total` (the last one may be smaller).
  instalment     numeric(12, 2) not null check (instalment > 0),
  repaid         numeric(12, 2) not null default 0,
  status         text not null default 'active' check (status in ('active', 'repaid')),
  created_at     timestamptz not null default now(),
  repaid_at      timestamptz
);

create unique index if not exists loans_one_active_idx on public.loans (chama_id, member_id) where status = 'active';
create index if not exists loans_member_idx on public.loans (member_id, created_at desc);

alter table public.ledger_transactions add column if not exists loan_id uuid unique references public.loans (id);

-- How much of a round payment repays a loan (the rest is contribution and savings).
alter table public.payments
  add column if not exists loan_repayment numeric(12, 2) not null default 0,
  add column if not exists loan_id uuid references public.loans (id);

-- Same as 0010, plus loan receivables (UNT-<code>-<member>-LOAN) and the chama's interest (UNT-<code>-INT).
create or replace function public.ledger_account(p_kind text, p_chama uuid default null, p_member uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  acc uuid;
  code text;
  who text;
  base text;
begin
  select id into acc from public.ledger_accounts
    where kind = p_kind and chama_id is not distinct from p_chama and member_id is not distinct from p_member;
  if found then
    return acc;
  end if;

  if p_chama is not null then
    select 'UNT-' || invite_code into base from public.chamas where id = p_chama;
  end if;
  if p_member is not null then
    select coalesce(full_name, 'Member') into who from public.members where id = p_member;
    code := upper(substr(replace(p_member::text, '-', ''), 1, 6));
  end if;

  insert into public.ledger_accounts (number, name, kind, normal, chama_id, member_id)
  values (
    case p_kind
      when 'paypal_pool' then 'UNT-POOL'
      when 'unitus_operating' then 'UNT-OPS'
      when 'chama_pot' then base || '-POT'
      when 'chama_interest' then base || '-INT'
      when 'member_savings' then base || '-' || code || '-SAV'
      when 'member_loan' then base || '-' || code || '-LOAN'
      when 'member_wallet' then 'UNT-W-' || code
      else base || '-' || code || '-FEE'
    end,
    case p_kind
      when 'paypal_pool' then 'PayPal pool (all money held)'
      when 'unitus_operating' then 'Unitus operating'
      when 'chama_pot' then 'Merry-go-round pot'
      when 'chama_interest' then 'Loan interest (shared out)'
      when 'member_savings' then 'Savings · ' || who
      when 'member_loan' then 'Loan owed · ' || who
      when 'member_wallet' then 'Wallet · ' || who
      else 'Joining fee (locked) · ' || who
    end,
    p_kind,
    -- What's owed to the chama (a loan) is an asset; everything else is held for someone.
    case when p_kind in ('paypal_pool', 'member_loan') then 'debit' else 'credit' end,
    p_chama,
    p_member
  )
  on conflict (kind, chama_id, member_id) do nothing
  returning id into acc;

  if acc is null then
    select id into acc from public.ledger_accounts
      where kind = p_kind and chama_id is not distinct from p_chama and member_id is not distinct from p_member;
  end if;
  return acc;
end;
$$;

-- Rounds a member has saved in (completed round payments with savings in them).
create or replace function public.saving_rounds(p_chama uuid, p_member uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.payments
  where chama_id = p_chama and member_id = p_member and kind = 'monthly_deduction' and round_id is not null
    and status = 'COMPLETED' and principal - coalesce(contribution, 0) - coalesce(loan_repayment, 0) > 0;
$$;

-- Rounds a member missed: finished rounds of the chama since their first round
-- payment (optionally within a window) without a payment from them.
create or replace function public.skipped_rounds(p_chama uuid, p_member uuid, p_from timestamptz default null, p_to timestamptz default null)
returns int
language sql stable security definer set search_path = public as $$
  with first_paid as (
    select min(r.created_at) as at
    from public.payments p join public.chama_rounds r on r.id = p.round_id
    where p.chama_id = p_chama and p.member_id = p_member and p.kind = 'monthly_deduction' and p.status = 'COMPLETED'
  )
  select count(*)::int
  from public.chama_rounds r, first_paid f
  where r.chama_id = p_chama and f.at is not null and r.created_at >= f.at
    and r.status <> 'collecting'
    and (p_from is null or r.created_at >= p_from)
    and (p_to is null or r.created_at <= p_to)
    and not exists (
      select 1 from public.payments p
      where p.round_id = r.id and p.member_id = p_member and p.status in ('COMPLETED', 'PENDING')
    );
$$;

-- What a member could borrow from a chama right now, and why not if nothing.
drop function if exists public.loan_offer(uuid, uuid);
create function public.loan_offer(p_chama uuid, p_member uuid)
returns table (
  saving_rounds int, skipped_rounds int, good_loans int, limit_percent numeric,
  savings numeric, limit_amount numeric, available numeric, lendable numeric,
  active_loan uuid, active_loan_chama uuid
)
language plpgsql stable security definer set search_path = public as $$
declare
  c public.chamas;
  held numeric;
  lent numeric;
begin
  select * into c from public.chamas where id = p_chama;
  saving_rounds := public.saving_rounds(p_chama, p_member);
  skipped_rounds := public.skipped_rounds(p_chama, p_member);
  -- Loans in this chama repaid without missing a round while they were open.
  select count(*)::int into good_loans from public.loans l
    where l.chama_id = p_chama and l.member_id = p_member and l.status = 'repaid'
      and public.skipped_rounds(p_chama, p_member, l.created_at, l.repaid_at) = 0;
  limit_percent := least(25 + 5 * good_loans, coalesce(c.loan_multiplier, 1) * 100);
  -- Their savings in this chama (the joining fee doesn't count).
  select coalesce(-sum(e.amount), 0) into savings
    from public.ledger_entries e join public.ledger_accounts a on a.id = e.account_id
    where a.chama_id = p_chama and a.member_id = p_member and a.kind = 'member_savings';
  limit_amount := greatest(0, round(savings * limit_percent / 100, 2));
  -- Everyone's savings and joining fees, less what's already out on loan.
  select coalesce(-sum(e.amount), 0) into held
    from public.ledger_entries e join public.ledger_accounts a on a.id = e.account_id
    where a.chama_id = p_chama and a.kind in ('member_savings', 'member_joining_fee');
  select coalesce(sum(l.principal * (l.total - l.repaid) / nullif(l.total, 0)), 0) into lent
    from public.loans l where l.chama_id = p_chama and l.status = 'active';
  lendable := greatest(0, round(held - lent, 2));
  -- One loan at a time, across all their chamas.
  select l.id, l.chama_id into active_loan, active_loan_chama
    from public.loans l where l.member_id = p_member and l.status = 'active' limit 1;
  available := case
    when active_loan is not null or skipped_rounds > 0 or saving_rounds < 4 then 0
    else least(limit_amount, lendable)
  end;
  return next;
end;
$$;

-- Takes out a loan: credited to the member's wallet. Checks every rule again
-- under a per-chama lock, so two requests can't lend the same savings twice.
create or replace function public.request_loan(p_chama uuid, p_member uuid, p_amount numeric, p_instalments int)
returns public.loans
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
  o record;
  l public.loans;
  tx uuid;
  amt numeric := round(p_amount, 2);
  interest numeric;
begin
  perform pg_advisory_xact_lock(hashtext('loans:' || p_chama::text));
  select * into c from public.chamas where id = p_chama;
  if not found or c.status = 'closed' then
    raise exception 'This chama isn''t lending' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.chama_members where chama_id = p_chama and member_id = p_member and joining_fee_paid_at is not null) then
    raise exception 'Only members who''ve paid the joining fee can borrow' using errcode = 'check_violation';
  end if;
  if amt is null or amt <= 0 then
    raise exception 'Enter an amount to borrow' using errcode = 'check_violation';
  end if;
  if p_instalments is null or p_instalments < 1 or p_instalments > 12 then
    raise exception 'Choose between 1 and 12 rounds to repay' using errcode = 'check_violation';
  end if;

  select * into o from public.loan_offer(p_chama, p_member);
  if o.saving_rounds < 4 then
    raise exception 'You can borrow after saving in 4 rounds (you''ve saved in %)', o.saving_rounds using errcode = 'check_violation';
  end if;
  if o.skipped_rounds > 0 then
    raise exception 'You can''t borrow after missing a round payment (% missed)', o.skipped_rounds using errcode = 'check_violation';
  end if;
  if o.active_loan is not null then
    raise exception 'Repay your current loan before taking another' using errcode = 'check_violation';
  end if;
  if amt > o.available then
    raise exception 'You can borrow up to $%', to_char(o.available, 'FM999999990.00') using errcode = 'check_violation';
  end if;

  interest := round(amt * c.loan_interest_rate / 100, 2);
  insert into public.loans (chama_id, member_id, principal, interest_rate, interest, total, instalments, instalment)
  values (p_chama, p_member, amt, c.loan_interest_rate, interest, amt + interest, p_instalments, ceil((amt + interest) * 100 / p_instalments) / 100)
  returning * into l;

  insert into public.ledger_transactions (chama_id, loan_id, kind, description, member_id, gross_amount, occurred_at)
  values (p_chama, l.id, 'loan', 'Loan to wallet (' || c.loan_interest_rate || '% interest)', p_member, amt, now())
  returning id into tx;
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('member_loan', p_chama, p_member), l.total);
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('member_wallet', null, p_member), -amt);
  if interest > 0 then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('chama_interest', p_chama), -interest);
  end if;
  return l;
end;
$$;

-- Same as 0008, plus loan repayments: that part of the payment pays down the
-- loan (and marks it repaid when it's all back).
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
  repayment numeric;
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
        || case when coalesce(p.loan_repayment, 0) > 0 then ' and loan repayment' else '' end
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
    repayment := coalesce(p.loan_repayment, 0);
    if contribution > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('chama_pot', p.chama_id), -contribution);
    end if;
    if p.principal - contribution - repayment > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('member_savings', p.chama_id, p.member_id), -(p.principal - contribution - repayment));
    end if;
    if repayment > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('member_loan', p.chama_id, p.member_id), -repayment);
      update public.loans
        set repaid = least(total, repaid + repayment),
            status = case when repaid + repayment >= total then 'repaid' else status end,
            repaid_at = case when repaid + repayment >= total then now() else repaid_at end
        where id = p.loan_id;
    end if;
  end if;

  if gap <> 0 then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('unitus_operating'), gap);
  end if;

  return tx;
end;
$$;

alter table public.loans enable row level security;
revoke execute on function public.ledger_account(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.saving_rounds(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.skipped_rounds(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.loan_offer(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.request_loan(uuid, uuid, numeric, int) from public, anon, authenticated;
revoke execute on function public.ledger_post_payment(text) from public, anon, authenticated;
