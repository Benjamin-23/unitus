-- A member's country (ISO 3166-1 alpha-2, e.g. KE), taken from PayPal's payer
-- details when they pay. Used for analytics (contributions by country).
--
-- Run after 0006 in the Supabase SQL Editor.

alter table public.members
  add column if not exists country text check (country ~ '^[A-Z]{2}$');
