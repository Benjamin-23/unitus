-- Chama accounts inside Unitus, kept with a double-entry ledger.
--
-- One real PayPal Business account holds all the money (UNT-POOL). Each chama
-- has accounts inside Unitus: its merry-go-round pot, and per member a savings
-- account and a locked joining-fee account. Every money movement is one
-- journal transaction whose entries sum to zero:
--
--   amount > 0  debit   (money arriving in the pool, or Unitus covering a gap)
--   amount < 0  credit  (money owed to a chama or member)
--
-- Invariant: UNT-POOL balance = sum of every chama account + UNT-OPS. The real
-- PayPal balance can be reconciled against UNT-POOL.
--
-- Run after 0005 in the Supabase SQL Editor.

create table if not exists public.ledger_accounts (
  id         uuid primary key default gen_random_uuid(),
  number     text not null unique,
  name       text not null,
  kind       text not null check (kind in ('paypal_pool', 'unitus_operating', 'chama_pot', 'member_savings', 'member_joining_fee')),
  -- Which side increases the balance: the pool is an asset (debit), everything owed is credit.
  normal     text not null check (normal in ('debit', 'credit')),
  chama_id   uuid references public.chamas (id),
  member_id  uuid references public.members (id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (kind, chama_id, member_id)
);

create table if not exists public.ledger_transactions (
  id            uuid primary key default gen_random_uuid(),
  chama_id      uuid references public.chamas (id),
  -- Each PayPal payment posts exactly once.
  payment_id    uuid unique references public.payments (id),
  kind          text not null check (kind in ('joining_fee', 'monthly_deduction', 'payout', 'adjustment')),
  description   text not null,
  member_id     uuid references public.members (id),
  gross_amount  numeric(12, 2),
  fee_charged   numeric(12, 2),
  paypal_fee    numeric(12, 2),
  occurred_at   timestamptz not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id             bigint generated always as identity primary key,
  transaction_id uuid not null references public.ledger_transactions (id),
  account_id     uuid not null references public.ledger_accounts (id),
  amount         numeric(12, 2) not null check (amount <> 0)
);

create index if not exists ledger_entries_account_idx on public.ledger_entries (account_id);
create index if not exists ledger_entries_tx_idx on public.ledger_entries (transaction_id);
create index if not exists ledger_transactions_chama_idx on public.ledger_transactions (chama_id, occurred_at);

-- Every transaction must balance (checked at commit, after all its entries exist).
create or replace function public.ledger_check_balanced() returns trigger
language plpgsql as $$
declare
  total numeric;
begin
  select coalesce(sum(amount), 0) into total from public.ledger_entries where transaction_id = new.transaction_id;
  if total <> 0 then
    raise exception 'Ledger transaction % does not balance (off by %)', new.transaction_id, total using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists ledger_entries_balanced on public.ledger_entries;
create constraint trigger ledger_entries_balanced after insert on public.ledger_entries
  deferrable initially deferred for each row execute function public.ledger_check_balanced();

-- The ledger is append-only: corrections are new, reversing transactions.
create or replace function public.ledger_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'The ledger is append-only; post a reversing transaction instead' using errcode = 'check_violation';
end;
$$;

drop trigger if exists ledger_entries_immutable on public.ledger_entries;
create trigger ledger_entries_immutable before update or delete on public.ledger_entries
  for each row execute function public.ledger_immutable();
drop trigger if exists ledger_transactions_immutable on public.ledger_transactions;
create trigger ledger_transactions_immutable before update or delete on public.ledger_transactions
  for each row execute function public.ledger_immutable();

-- Finds or opens an account. Numbers: UNT-POOL, UNT-OPS, UNT-<invite>-POT,
-- UNT-<invite>-<member>-SAV / -FEE.
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
      else base || '-' || code || '-FEE'
    end,
    case p_kind
      when 'paypal_pool' then 'PayPal pool (all money held)'
      when 'unitus_operating' then 'Unitus operating'
      when 'chama_pot' then 'Merry-go-round pot'
      when 'member_savings' then 'Savings · ' || who
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

-- Posts a completed chama payment to the ledger. Idempotent: returns the
-- existing transaction if this payment was already posted.
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
  -- What PayPal actually deposited. Before fee tracking existed it wasn't recorded.
  net := coalesce(p.net_amount, p.principal);
  gap := p.principal - net;

  insert into public.ledger_transactions (chama_id, payment_id, kind, description, member_id, gross_amount, fee_charged, paypal_fee, occurred_at)
  values (
    p.chama_id, p.id, p.kind,
    case when p.kind = 'joining_fee' then 'Joining fee' else 'Monthly contribution ' || coalesce(p.reference, '') end,
    p.member_id, p.amount, p.fee_charged, p.paypal_fee, p.created_at
  )
  returning id into tx;

  -- Money that arrived in the pool.
  insert into public.ledger_entries (transaction_id, account_id, amount)
    values (tx, public.ledger_account('paypal_pool'), net);

  -- What the chama and member are owed.
  if p.kind = 'joining_fee' then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('member_joining_fee', p.chama_id, p.member_id), -p.principal);
  else
    contribution := least(c.monthly_contribution, p.principal);
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('chama_pot', p.chama_id), -contribution);
    if p.principal - contribution > 0 then
      insert into public.ledger_entries (transaction_id, account_id, amount)
        values (tx, public.ledger_account('member_savings', p.chama_id, p.member_id), -(p.principal - contribution));
    end if;
  end if;

  -- If PayPal took more than the fee the member paid, Unitus covers the gap so
  -- the chama is never short; if it took less, the difference is Unitus income.
  if gap <> 0 then
    insert into public.ledger_entries (transaction_id, account_id, amount)
      values (tx, public.ledger_account('unitus_operating'), gap);
  end if;

  return tx;
end;
$$;

-- Account balances, shown on each account's normal side.
create or replace view public.ledger_balances with (security_invoker = true) as
select a.id, a.number, a.name, a.kind, a.normal, a.chama_id, a.member_id,
       coalesce(sum(e.amount), 0) * case when a.normal = 'debit' then 1 else -1 end as balance
from public.ledger_accounts a
left join public.ledger_entries e on e.account_id = a.id
group by a.id;

-- Server-only, like everything else.
alter table public.ledger_accounts enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_entries enable row level security;
revoke all on public.ledger_balances from anon, authenticated;
revoke execute on function public.ledger_account(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.ledger_post_payment(text) from public, anon, authenticated;
