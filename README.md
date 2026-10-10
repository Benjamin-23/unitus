# Unitus

**A chama for people who live far apart.** Unitus runs a savings group (a *chama*) online: members anywhere pay in every month through PayPal, one member wins the monthly merry-go-round pot, savings are shared out at mid-year or year end, and members can borrow against what they've saved.

Built for a hackathon with Next.js, shadcn/ui, AG Grid, AG Studio and PayPal.

> **Status: working prototype.** PayPal payments run against the **sandbox**. Member data, groups and partner offers are **demo data** until the backend exists. Search the code for `TODO(backend)` to find every placeholder.

---

## The idea

Chamas help families and friends save together, but they run on monthly meetings, cash and trust in one treasurer. That breaks down when members live in different countries.

| The problem | With Unitus |
|---|---|
| Members abroad can't make the meeting | Contribute by PayPal from any country |
| Money sits with one treasurer, on trust | Money stays in the chama's own PayPal account; **nobody can withdraw** |
| Rules change quietly; the draw gets disputed | Rules **lock when the chama is created**; the draw is random and recorded |
| Records live in a notebook | One shared ledger every member can see |

### How it makes money

```
Members save every month ─► A winner gets the pot ─► Partner businesses offer member deals
          ▲                                                         │
          └──────── chamas stay free ◄── Unitus earns a 3% referral fee on each sale
```

- **Free for members and chamas** (standard PayPal fees apply to payments).
- **Partner businesses** (electronics, cars, solar, phones, farming, education) list offers sized to members' payouts and pay a **3% referral fee only when they sell**. They see demand in totals, never member names or contacts.

---

## Features

### For members
- **Log in with PayPal** (real, via PayPal's OpenID Connect): your PayPal account is your Unitus account; members are stored in Supabase
- **Onboarding:** join a chama with an invite code, pay the **joining fee** (locked in your savings until you leave), agree to **monthly auto-deductions**
- **Dashboard:** savings, merry-go-round progress, loan balance, next deduction, locked rules, chama account
- **Loans:** borrow up to *savings × group multiplier* at the group's flat rate; repayments join the monthly deduction
- **Leave the chama** only after the merry-go-round completes its cycle; any loan is settled from savings
- **Analytics** (AG Studio): contributions by month, savings by country, loans per member, cross-filtering
- **Partner offers:** deals ranked by how well they fit your payout (covered / deposit / out of reach), with an opt-out

### For chama creators
- **Start a chama** in five steps with a live preview: contribution, savings, joining fee, deduction day, share-out date, loan multiplier and interest rate
- Rules **lock on creation**: no edits and no withdrawals; money only leaves through automatic payouts
- A chama can only be **deleted once it's clean**: everyone paid out, savings shared, no loans left

### For businesses (`/business`)
- Partner application and dashboard: offers (AG Grid), views, sales, earnings after the referral fee
- Aggregate winner demand by payout size (no personal data)
- New-offer form with optional instalments (member pays the deposit from their payout)

### Also
- Landing page with an auto-playing product tour of real screenshots on laptop, tablet and phone
- Light, dark and system themes
- Responsive down to phone width; respects *reduce motion*

---

## PayPal integration (sandbox)

Uses PayPal's **v6 Web SDK** with orders created and captured on the server.

| What | How |
|---|---|
| Joining fee | One-time payment that **also saves the member's PayPal** (vault) for monthly charges |
| Monthly deduction | Charged to the saved PayPal with no approval step. A scheduler would run it on the deduction day; the dashboard has a **"Run it now (sandbox)"** button for testing |
| Partner offer | Checkout for the member price, or the deposit for instalment items |

Server endpoints live in `app/api/paypal/`. Amounts are always calculated on the server; every POST sends a `PayPal-Request-Id` so retries can't double-charge; 429/5xx responses are retried with backoff; errors log PayPal's `debug_id`.

**Before going live**
- Add a webhook endpoint (needs a public URL) to confirm payments
- Splitting the referral fee automatically needs PayPal's multiparty/platform onboarding
- Offering instalments may need a credit licence in some countries; get the terms checked

---

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env      # then fill in the values below
pnpm dev                  # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Required | What it is |
|---|---|---|
| `PAYPAL_CLIENT_ID` | yes | Sandbox app client ID (developer.paypal.com → Apps & Credentials) |
| `PAYPAL_CLIENT_SECRET` | yes | Sandbox app secret. Server only, never sent to the browser |
| `PAYPAL_ENVIRONMENT` | yes | `sandbox` or `production` |
| `PAYPAL_DEMO_MERCHANT_EMAIL` | no | A sandbox business account that receives partner-offer payments (otherwise your own account does) |
| `PAYPAL_DOMAINS` | production | Your site's domain, for PayPal client tokens |
| `SESSION_SECRET` | yes | 32+ random characters that sign the login cookie. Changing it logs everyone out |
| `SUPABASE_URL` | yes | Supabase project URL (Project Settings → API) |
| `SUPABASE_SECRET_KEY` | yes | Supabase secret / service-role key. Server only, never prefix with `NEXT_PUBLIC_` |
| `PAYPAL_LOGIN_REDIRECT_URI` | no | Override the Log in with PayPal return URL (default `<site>/api/auth/paypal/callback`) |
| `NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` | for analytics | AG Studio licence. Checked in the browser, so it ships in the client bundle |

`.env` is git-ignored. Never commit real keys.

### Set up the database (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/migrations/0001_members_and_payments.sql` and run it.
3. Copy the project URL and secret key into `.env`.

The app only talks to Supabase from the server. Row level security is on with no policies, so the public key can't read anything.

### Set up Log in with PayPal
1. developer.paypal.com → **Apps & Credentials** → your sandbox app → **Features** → tick **Log in with PayPal** → **Advanced settings**.
2. Return URL: `http://127.0.0.1:3000/api/auth/paypal/callback` (must match exactly; add your deployed URL later). PayPal won't save `localhost` here, so in development the app switches to `127.0.0.1` automatically when you click Log in.
3. Information to request: **Full name** and **Email**. Privacy policy and user agreement URLs can be `https://example.com` for testing.
4. Save, then go to `/login` and sign in with a sandbox **personal** account.

### Try a payment
1. In the PayPal developer dashboard, create a sandbox **personal** account (the member) and use your app's **business** account as the chama.
2. Log in with PayPal, go to `/onboarding`, use invite code **`UMOJA-7K2Q`**, tick the agreement and pay the joining fee with the personal account.
3. On `/dashboard`, click **Run it now (sandbox)** to charge the monthly deduction.
4. Check the balances at [sandbox.paypal.com](https://www.sandbox.paypal.com).

### Scripts

| Command | |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `python3 scripts/capture-screens.py --base-url http://localhost:3000` | Re-capture the landing-page screenshots (needs Chrome and Pillow; run the app first) |

---

## Pages

| Route | |
|---|---|
| `/` | Landing page |
| `/login`, `/signup` | Log in with PayPal |
| `/onboarding` | Join a chama, pay the joining fee, set up auto-deductions |
| `/groups/new` | Start a chama |
| `/dashboard` | Member overview, records (AG Grid), loans, leave / delete |
| `/dashboard/analytics` | AG Studio analytics |
| `/dashboard/offers` | Partner offers |
| `/business`, `/business/dashboard` | Partner sign-up and dashboard |

## Project structure

```
app/                 routes (App Router) and API route handlers (app/api/paypal)
components/
  landing/           landing page sections, device frames, product tour
  dashboard/         member dashboard, AG Grid tables, loan / leave / delete dialogs
  analytics/         AG Studio report and theme
  marketplace/       offers browser, partner application and dashboard
  onboarding/ create/ auth/ paypal/ theme/ illustrations/ ui/ (shadcn)
lib/
  chama.ts           chama rules: deductions, loan limits, exit, deletion, validation
  marketplace.ts     offer matching and referral fee
  paypal/            PayPal REST client, orders, Log in with PayPal, browser SDK loader
  auth/              signed session cookie, current-member hook
  db.ts              Supabase (server only): members, saved PayPal, payments
  mock-data.ts, marketplace-data.ts   demo data
scripts/capture-screens.py           landing-page screenshot capture
supabase/migrations/                 database schema
proxy.ts                             sends signed-out visitors to /login
```

## Tech stack

Next.js 16 (App Router, Cache Components) · Supabase (Postgres) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI) · AG Grid Community · AG Studio · PayPal v6 Web SDK + REST · next-themes · lucide-react
