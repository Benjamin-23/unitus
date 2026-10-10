-- Chamas, their members, and joining by invite code.
-- Run after 0001 in the Supabase SQL Editor (or `supabase db push`).

create table if not exists public.chamas (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(name) between 3 and 80),
  description          text check (char_length(description) <= 500),
  -- Shared with members to join, e.g. K7QM-3XPA.
  invite_code          text not null unique check (invite_code ~ '^[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  created_by           uuid not null references public.members (id),
  -- The rules. Locked once the chama exists (see trigger below).
  member_limit         int not null check (member_limit between 2 and 30),
  start_month          date not null check (extract(day from start_month) = 1),
  currency             text not null default 'USD',
  monthly_contribution numeric(12, 2) not null check (monthly_contribution > 0),
  monthly_savings      numeric(12, 2) not null check (monthly_savings >= 0),
  joining_fee          numeric(12, 2) not null check (joining_fee > 0),
  deduction_day        int not null check (deduction_day between 1 and 28),
  share_out            text not null check (share_out in ('mid-year', 'year-end')),
  loan_multiplier      int not null check (loan_multiplier between 1 and 5),
  loan_interest_rate   numeric(5, 2) not null check (loan_interest_rate between 0 and 30),
  -- open: accepting members · active: full, cycle running · closed: wound up
  status               text not null default 'open' check (status in ('open', 'active', 'closed')),
  created_at           timestamptz not null default now()
);

create table if not exists public.chama_members (
  chama_id             uuid not null references public.chamas (id) on delete restrict,
  member_id            uuid not null references public.members (id) on delete restrict,
  role                 text not null default 'member' check (role in ('admin', 'member')),
  joined_at            timestamptz not null default now(),
  joining_fee_paid_at  timestamptz,
  primary key (chama_id, member_id)
);

create index if not exists chama_members_member_idx on public.chama_members (member_id);

-- Payments can now belong to a chama.
alter table public.payments add column if not exists chama_id uuid references public.chamas (id);

-- Rules can never change after creation: only the status may be updated.
create or replace function public.chamas_lock_rules() returns trigger
language plpgsql as $$
begin
  if (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status') then
    raise exception 'Chama rules are locked and cannot be edited' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists chamas_lock_rules on public.chamas;
create trigger chamas_lock_rules before update on public.chamas
  for each row execute function public.chamas_lock_rules();

-- Creates a chama and makes its creator the first member (admin), atomically.
create or replace function public.create_chama(p_member uuid, p_invite_code text, p_rules jsonb)
returns public.chamas
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
begin
  insert into public.chamas (
    name, description, invite_code, created_by, member_limit, start_month, monthly_contribution,
    monthly_savings, joining_fee, deduction_day, share_out, loan_multiplier, loan_interest_rate
  ) values (
    p_rules->>'name', nullif(p_rules->>'description', ''), p_invite_code, p_member,
    (p_rules->>'memberLimit')::int, (p_rules->>'startMonth')::date,
    (p_rules->>'monthlyContribution')::numeric, (p_rules->>'monthlySavings')::numeric,
    (p_rules->>'joiningFee')::numeric, (p_rules->>'deductionDay')::int, p_rules->>'shareOut',
    (p_rules->>'loanMultiplier')::int, (p_rules->>'loanInterestRate')::numeric
  ) returning * into c;

  insert into public.chama_members (chama_id, member_id, role) values (c.id, p_member, 'admin');
  return c;
end;
$$;

-- Joins a chama by invite code. Locks the chama row so two people can't take
-- the last place at once. Joining again is a no-op. When the last place is
-- taken the chama becomes active and stops accepting members.
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

  if exists (select 1 from public.chama_members m where m.chama_id = c.id and m.member_id = p_member) then
    return query select c.id, true;
    return;
  end if;

  if c.status <> 'open' then
    raise exception 'This chama is no longer accepting members' using errcode = 'check_violation';
  end if;

  select count(*) into taken from public.chama_members m where m.chama_id = c.id;
  if taken >= c.member_limit then
    raise exception 'This chama is full' using errcode = 'check_violation';
  end if;

  insert into public.chama_members (chama_id, member_id) values (c.id, p_member);
  if taken + 1 >= c.member_limit then
    update public.chamas set status = 'active' where id = c.id;
  end if;
  return query select c.id, false;
end;
$$;

-- Server-only, like the other tables.
alter table public.chamas enable row level security;
alter table public.chama_members enable row level security;
revoke execute on function public.create_chama(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_chama(uuid, text) from public, anon, authenticated;
