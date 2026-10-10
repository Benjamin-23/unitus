-- Unitus: members who sign in with PayPal, their saved PayPal (for monthly
-- auto-deductions) and a ledger of every PayPal payment.
--
-- Run in the Supabase dashboard (SQL Editor) or with `supabase db push`.
--
-- Access model: the app talks to these tables only from the server, with the
-- secret (service role) key. Row level security is enabled with no policies,
-- so the public anon key can read or write nothing.

create table if not exists public.members (
  id               uuid primary key default gen_random_uuid(),
  -- Stable PayPal identity (OpenID Connect user_id). Never changes for a PayPal account.
  paypal_user_id   text not null unique,
  email            text,
  full_name        text,
  email_verified   boolean not null default false,
  paypal_verified  boolean not null default false,
  created_at       timestamptz not null default now(),
  last_login_at    timestamptz not null default now()
);

-- A member's PayPal saved for merchant-initiated charges (the monthly deduction).
create table if not exists public.paypal_vaults (
  member_id           uuid primary key references public.members (id) on delete cascade,
  vault_id            text not null,
  paypal_customer_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members (id) on delete restrict,
  kind               text not null check (kind in ('joining_fee', 'monthly_deduction', 'offer')),
  -- What was paid for, e.g. an offer id.
  reference          text,
  paypal_order_id    text not null unique,
  paypal_capture_id  text,
  amount             numeric(12, 2) not null check (amount > 0),
  currency           text not null default 'USD',
  -- PayPal order status: CREATED, PAYER_ACTION_REQUIRED, COMPLETED, ...
  status             text not null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists payments_member_created_idx on public.payments (member_id, created_at desc);

alter table public.members enable row level security;
alter table public.paypal_vaults enable row level security;
alter table public.payments enable row level security;
