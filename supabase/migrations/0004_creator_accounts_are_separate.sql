-- Admin and member accounts are completely separate, in both directions:
--   * 0003: a chama's admin account can't be one of its members.
--   * 0004: an account that takes part in any chama (is a member of one, or
--     has ever paid into one) can't create a chama.
-- Someone who wants to start a chama does it from a separate PayPal account:
-- a new one signed up at PayPal, or another one they already have.
--
-- Run after 0003 in the Supabase SQL Editor.

create or replace function public.can_create_chama(p_member uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.chama_members where member_id = p_member)
     and not exists (select 1 from public.payments where member_id = p_member);
$$;

create or replace function public.create_chama(p_member uuid, p_invite_code text, p_rules jsonb)
returns public.chamas
language plpgsql security definer set search_path = public as $$
declare
  c public.chamas;
begin
  if not public.can_create_chama(p_member) then
    raise exception 'This PayPal account already takes part in a chama, so it can''t create one. Use a separate PayPal account to start a chama'
      using errcode = 'check_violation';
  end if;

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
  return c;
end;
$$;

-- An admin account (one that created a chama) can't become a member of any chama.
create or replace function public.chama_members_not_admin() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.chamas c where c.created_by = new.member_id) then
    raise exception 'Admin accounts can''t be chama members. Log in with a different PayPal account to join'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.can_create_chama(uuid) from public, anon, authenticated;
revoke execute on function public.create_chama(uuid, text, jsonb) from public, anon, authenticated;
