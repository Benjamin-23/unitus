-- The account that creates a chama is its admin only: it can't be a member,
-- can't pay into the chama and can't receive payouts. To take part, the
-- creator logs in with a different (personal) PayPal account and joins with
-- the invite code like everyone else. Keeps admin rights and money apart.
--
-- Run after 0002 in the Supabase SQL Editor.

-- Creating a chama no longer adds the creator as a member.
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
  return c;
end;
$$;

-- Joining rejects the chama's own admin account.
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

-- Defence in depth: no code path can make a chama's admin one of its members.
create or replace function public.chama_members_not_admin() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.chamas c where c.id = new.chama_id and c.created_by = new.member_id) then
    raise exception 'A chama''s admin account can''t be one of its members' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists chama_members_not_admin on public.chama_members;
create trigger chama_members_not_admin before insert or update on public.chama_members
  for each row execute function public.chama_members_not_admin();

-- Existing data: creators were added as members by the old create_chama.
-- Remove those memberships where no joining fee was paid. A paid one is kept
-- (money is attached) and needs a decision: refund it, or treat it as legacy.
delete from public.chama_members cm
using public.chamas c
where cm.chama_id = c.id
  and cm.member_id = c.created_by
  and cm.joining_fee_paid_at is null;

revoke execute on function public.create_chama(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_chama(uuid, text) from public, anon, authenticated;
