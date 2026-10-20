-- Member wallets: a won pot is credited to the winner's Unitus wallet instead
-- of being paid straight to their PayPal. From the wallet a member can
-- withdraw to their PayPal (or, soon, spend with partner businesses).
--
--   Round collected  → ledger_credit_pot: chama pot → member wallet (no PayPal call)
--   Withdraw         → request_withdrawal: wallet → pool, then a PayPal payout
--   Payout sent      → settle_withdrawal('sent'): Unitus covers PayPal's payout fee
--   Payout failed    → settle_withdrawal('failed'): the money goes back to the wallet
--
-- The wallet is per member, across all their chamas (UNT-W-<member>).
--
-- Run after 0009 in the Supabase SQL Editor.

alter table public.ledger_accounts drop constraint if exists ledger_accounts_kind_check;
alter table public.ledger_accounts add constraint ledger_accounts_kind_check
  check (kind in ('paypal_pool', 'unitus_operating', 'chama_pot', 'member_savings', 'member_joining_fee', 'member_wallet'));

alter table public.ledger_transactions drop constraint if exists ledger_transactions_kind_check;
alter table public.ledger_transactions add constraint ledger_transactions_kind_check
  check (kind in ('joining_fee', 'monthly_deduction', 'payout', 'adjustment', 'pot_credit', 'withdrawal', 'withdrawal_fee', 'withdrawal_reversal'));

create table if not exists public.withdrawals (
  id               uuid primary key default gen_random_uuid(),
  member_id        uuid not null references public.members (id),
  amount           numeric(12, 2) not null check (amount > 0),
  -- requested: taken from the wallet, payout not yet accepted by PayPal ·
  -- sending: PayPal accepted the payout · sent: it arrived · failed: money back in the wallet
  status           text not null default 'requested' check (status in ('requested', 'sending', 'sent', 'failed')),
  payout_batch_id  text,
  payout_item_id   text,
  payout_status    text,
  payout_fee       numeric(12, 2),
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

create index if not exists withdrawals_member_idx on public.withdrawals (member_id, created_at desc);
create index if not exists withdrawals_status_idx on public.withdrawals (status);

-- Each withdrawal posts each of its transactions at most once.
alter table public.ledger_transactions add column if not exists withdrawal_id uuid references public.withdrawals (id);
create unique index if not exists ledger_transactions_withdrawal_idx
  on public.ledger_transactions (withdrawal_id, kind) where withdrawal_id is not null;

-- Same as 0006, plus member wallets (UNT-W-<member>, no chama).
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
      when 'member_savings' then base || '-' || code || '-SAV'
      when 'member_wallet' then 'UNT-W-' || code
      else base || '-' || code || '-FEE'
    end,
    case p_kind
      when 'paypal_pool' then 'PayPal pool (all money held)'
      when 'unitus_operating' then 'Unitus operating'
      when 'chama_pot' then 'Merry-go-round pot'
      when 'member_savings' then 'Savings · ' || who
      when 'member_wallet' then 'Wallet · ' || who
      else 'Joining fee (locked) · ' || who
    end,
    p_kind,
    case when p_kind = 'paypal_pool' then 'debit' else 'credit' end,
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

-- A member's wallet balance (what they can withdraw or spend).
create or replace function public.wallet_balance(p_member uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(-sum(e.amount), 0)
  from public.ledger_entries e
  join public.ledger_accounts a on a.id = e.account_id
  where a.kind = 'member_wallet' and a.member_id = p_member;
$$;

-- Moves a collected round's pot into the recipient's wallet. Idempotent per round.
create or replace function public.ledger_credit_pot(p_round uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.chama_rounds;
  tx uuid;
begin
  select * into r from public.chama_rounds where id = p_round;
  if not found or coalesce(r.pot, 0) <= 0 then
    return null;
  end if;

  select id into tx from public.ledger_transactions where round_id = r.id;
  if found then
    return tx;
  end if;

  insert into public.ledger_transactions (chama_id, round_id, kind, description, member_id, gross_amount, occurred_at)
  values (r.chama_id, r.id, 'pot_credit', 'Round ' || r.number || ' pot to wallet', r.recipient_id, r.pot, coalesce(r.completed_at, now()))
  returning id into tx;

  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('chama_pot', r.chama_id), r.pot);
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('member_wallet', null, r.recipient_id), -r.pot);
  return tx;
end;
$$;

-- Takes money out of a wallet for a withdrawal. Refuses more than the balance;
-- one withdrawal at a time per member, so two clicks can't overdraw.
create or replace function public.request_withdrawal(p_member uuid, p_amount numeric)
returns public.withdrawals
language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawals;
  tx uuid;
  amt numeric := round(p_amount, 2);
begin
  if amt is null or amt <= 0 then
    raise exception 'Enter an amount to withdraw' using errcode = 'check_violation';
  end if;
  perform pg_advisory_xact_lock(hashtext('wallet:' || p_member::text));
  if public.wallet_balance(p_member) < amt then
    raise exception 'That''s more than your wallet balance' using errcode = 'check_violation';
  end if;

  insert into public.withdrawals (member_id, amount) values (p_member, amt) returning * into w;

  insert into public.ledger_transactions (withdrawal_id, kind, description, member_id, gross_amount, occurred_at)
  values (w.id, 'withdrawal', 'Withdrawal to PayPal', p_member, amt, now())
  returning id into tx;
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('member_wallet', null, p_member), amt);
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('paypal_pool'), -amt);
  return w;
end;
$$;

-- Records how a withdrawal's payout ended. Sent: Unitus pays PayPal's payout
-- fee. Failed: the amount goes back to the wallet. Idempotent.
create or replace function public.settle_withdrawal(p_id uuid, p_outcome text, p_status text, p_fee numeric default 0, p_item text default null)
returns public.withdrawals
language plpgsql security definer set search_path = public as $$
declare
  w public.withdrawals;
  tx uuid;
begin
  select * into w from public.withdrawals where id = p_id for update;
  if not found or w.status in ('sent', 'failed') then
    return w;
  end if;

  if p_outcome = 'sent' then
    if coalesce(p_fee, 0) > 0 then
      insert into public.ledger_transactions (withdrawal_id, kind, description, member_id, paypal_fee, occurred_at)
      values (w.id, 'withdrawal_fee', 'PayPal payout fee (paid by Unitus)', w.member_id, p_fee, now())
      returning id into tx;
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('unitus_operating'), p_fee);
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('paypal_pool'), -p_fee);
    end if;
    update public.withdrawals
      set status = 'sent', payout_status = p_status, payout_fee = p_fee, payout_item_id = coalesce(p_item, payout_item_id), completed_at = now()
      where id = w.id returning * into w;
  elsif p_outcome = 'failed' then
    insert into public.ledger_transactions (withdrawal_id, kind, description, member_id, gross_amount, occurred_at)
    values (w.id, 'withdrawal_reversal', 'Withdrawal returned to wallet', w.member_id, w.amount, now())
    returning id into tx;
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('paypal_pool'), w.amount);
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('member_wallet', null, w.member_id), -w.amount);
    update public.withdrawals
      set status = 'failed', payout_status = p_status, payout_item_id = coalesce(p_item, payout_item_id), completed_at = now()
      where id = w.id returning * into w;
  else
    raise exception 'Unknown outcome %', p_outcome;
  end if;
  return w;
end;
$$;

alter table public.withdrawals enable row level security;
revoke execute on function public.ledger_account(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.wallet_balance(uuid) from public, anon, authenticated;
revoke execute on function public.ledger_credit_pot(uuid) from public, anon, authenticated;
revoke execute on function public.request_withdrawal(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.settle_withdrawal(uuid, text, text, numeric, text) from public, anon, authenticated;
