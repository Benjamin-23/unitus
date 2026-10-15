-- Creating a chama no longer needs a separate PayPal account.
--
-- Unitus holds every chama's money in its own pool and only the scheduler
-- moves it, so being a chama's admin gives no access to money. Therefore:
--   * any signed-in member can create a chama (0004's restriction is lifted);
--   * a chama's creator can also join it as a member (0003's restriction is lifted);
--   * a member can join as many chamas as they like.
-- Creating a chama opens its account inside Unitus straight away (UNT-<invite>-POT).
--
-- Run after 0008 in the Supabase SQL Editor.

drop trigger if exists chama_members_not_admin on public.chama_members;
drop function if exists public.chama_members_not_admin();

create or replace function public.can_create_chama(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where id = p_member);
$$;

create or replace function public.create_chama(p_member uuid, p_invite_code text, p_rules jsonb)
returns public.chamas
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
  starts timestamptz := (p_rules->>'startsAt')::timestamptz;
begin
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

  -- The chama's account inside Unitus exists from day one.
  perform public.ledger_account('chama_pot', c.id);
  return c;
end;
$$;

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

-- Chamas created before this migration get their account too.
select public.ledger_account('chama_pot', id) from public.chamas;

revoke execute on function public.can_create_chama(uuid) from public, anon, authenticated;
revoke execute on function public.create_chama(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_chama(uuid, text) from public, anon, authenticated;
