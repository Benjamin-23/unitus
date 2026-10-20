-- SANDBOX ONLY. Wipes every chama, payment, round and ledger entry so you can
-- start fresh. Member logins are kept. Never run this against real money:
-- the ledger is append-only on purpose, and this bypasses that.
--
-- Run in the Supabase SQL Editor after the migrations.

truncate table
  public.withdrawals,
  public.ledger_entries,
  public.ledger_transactions,
  public.ledger_accounts,
  public.chama_rounds,
  public.payments,
  public.paypal_vaults,
  public.chama_members,
  public.chamas
restart identity;

-- Members keep their login; clear what came from old payments.
update public.members set country = null, paypal_payer_id = null;
