-- Fee tracking. Members pay PayPal's transaction fee on top, so the chama
-- receives exactly the amount its rules say.
--
--   amount        what PayPal charged the member (gross)            e.g. 104.37
--   principal     what belongs to the chama / member's balance       e.g. 100.00
--   fee_charged   processing fee added on top (amount - principal)   e.g.   4.37
--   paypal_fee    PayPal's actual fee, from the capture              e.g.   4.37
--   net_amount    what actually reached the pool (amount - fee)      e.g. 100.00
--
-- Run after 0004 in the Supabase SQL Editor.

alter table public.payments
  add column if not exists principal   numeric(12, 2),
  add column if not exists fee_charged numeric(12, 2) not null default 0,
  add column if not exists paypal_fee  numeric(12, 2),
  add column if not exists net_amount  numeric(12, 2);

-- Earlier payments had no fee added: the whole amount was the principal.
update public.payments set principal = amount where principal is null;

alter table public.payments alter column principal set not null;
