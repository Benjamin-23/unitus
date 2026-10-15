# Unitus

**A chama for people who live far apart.** Unitus runs a savings group (a *chama*) online. Members anywhere pay in through PayPal on the chama's schedule (daily, weekly, monthly and more), one member is drawn to receive each round's merry-go-round pot, savings are shared out at mid-year or year end, and members can borrow against what they've saved.

Built for a hackathon with Next.js, Supabase, PayPal, shadcn/ui, AG Grid and AG Studio.

> **Status: working prototype on the PayPal sandbox.** Log in, chamas, invite codes, joining fees, automatic rounds (deductions, random draw and PayPal payouts), fees, the ledger and the Unitus wallet are real. Loans, the savings share-out and webhooks are not built yet (see [Roadmap](#roadmap)). Partner offers use a sample catalogue. Search the code for `TODO(backend)` to find placeholders.

---

## The concept

### The problem

Chamas help families and friends save together, but they run on regular meetings, cash, and trust in one treasurer. That breaks down when members live in different countries.

| The problem | With Unitus |
|---|---|
| Members abroad can't make the meeting | Contribute by PayPal from any country |
| Money sits with one treasurer, on trust | Money sits with Unitus, not with any member; **nobody can withdraw it** |
| Rules change quietly; the draw gets disputed | Rules **lock when the chama is created**; the draw is random and recorded |
| Records live in a notebook | One shared ledger and statement every member can see |

### How a chama works

1. **Anyone starts a chama**, with no extra PayPal account needed. They set its rules: how often it runs (daily, every 3 days, weekly, every 2 weeks, monthly, or every 30 minutes for sandbox testing), when the first round runs, the contribution and savings per round, joining fee, maximum members, share-out date, loan multiplier and interest rate. The rules **lock** as soon as it's created, and Unitus opens the chama's account (`UNT-<invite code>`).
2. **Members join** with an invite code or link and pay the **joining fee** through PayPal. That payment also saves their PayPal for automatic charges. The fee stays locked in their savings until they leave. The creator can join too, and anyone can be in **as many chamas as they like**.
3. **The chama starts with 2 members.** The first round runs at its start time once 2 members have paid the joining fee. Others keep joining while it runs, up to the maximum.
4. **Each round, automatically:** one member who hasn't received yet this cycle is **drawn at random**. Everyone else is charged the contribution, everyone is charged their savings (the PayPal fee is added on top), and the pot is **paid to the recipient's PayPal**.
5. **Late joiners are fair to everyone:** someone who joins mid-cycle pays into the rounds after they join. Members who received before they joined don't pay into their round, since the late joiner never paid them. Over a cycle, everyone's contributions paid and received come out even. A cycle ends when every member has received once.
6. **Savings** are shared out at mid-year or year end. **Loans** can be taken up to *savings × multiplier* at the chama's rate.
7. **A member can leave** only once the current cycle has gone all the way round, and gets their savings and joining fee back. **A chama can be deleted** only when it's clean: everyone paid out, savings shared, no loans left.

### Who's who

| Role | Can | Can't |
|---|---|---|
| **Chama admin** (creator) | Set the rules once, invite members, see the chama's records, join it as a member | Edit rules, or move money |
| **Member** | Join any number of chamas, pay, receive the pot on their turn, see their balance and the statement, leave after the cycle | Withdraw the chama's money |
| **Unitus operator** (staff) | View the Unitus wallet across all chamas (read-only) | Move money by hand |
| **Scheduler** (server) | Run rounds: charge members, draw the recipient, pay out | — |

Admin rights and money are kept strictly apart: **managing a group never gives access to its funds.** Only the scheduler moves money. A creator who joins their own chama is treated exactly like any other member.

### Where the money is: one pool, accounts inside Unitus

Unitus works like a bank: **one real PayPal Business account holds all the money**, and each chama has **accounts inside Unitus**, kept with a double-entry ledger.

```
          ┌──────────────────────────────────────────────┐
          │  Unitus PayPal Business account (real money)  │  UNT-POOL
          └──────────────────────────────────────────────┘
                            ▲ always equals the sum of ▼
  ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
  │ UNT-R2NM-BSMA      │ │ UNT-…  (chama B)   │ │ UNT-OPS            │
  │  ├ -POT  pot       │ │                    │ │ Unitus's own money │
  │  ├ -…-SAV savings  │ │                    │ │                    │
  │  └ -…-FEE joining  │ │                    │ │                    │
  └───────────────────┘ └───────────────────┘ └───────────────────┘
```

- Every payment is posted as one transaction whose entries balance to zero. For example, a $150 deduction posts +$150 to the pool, $100 to the chama's pot and $50 to the member's savings. A payout takes the pot back out of the pool to the recipient.
- The database refuses unbalanced or duplicate postings, and the ledger is append-only.
- If PayPal takes more than the fee a member paid, Unitus covers the gap so a chama is never short. Unitus also covers PayPal's payout fee (2% in the sandbox).
- Comparing `UNT-POOL` with PayPal's real balance (shown on the Unitus wallet screen) catches money moved outside the app.

Full design: [`docs/payments-architecture.md`](docs/payments-architecture.md).

### Fees

Members pay PayPal's processing fee on top of what goes to the chama, so the chama receives the full amount. The fee is grossed up as `(amount + $0.30) / (1 − 3.9%)` (configurable). For example, $100 becomes $104.37 and $150 becomes $156.40. PayPal's actual fee and net are recorded for every payment.

### How Unitus makes money

```
Members save every round ─► A member gets the pot ─► Partner businesses offer member deals
          ▲                                                         │
          └──────── chamas stay free ◄── Unitus earns a 3% referral fee on each sale
```

- **Free for members and chamas.** Only PayPal's fee applies.
- **Partner businesses** (electronics, cars, solar, phones, farming, education) list offers sized to members' payouts and pay a **3% referral fee only when they sell**. They see demand in totals, never member names or contacts.

---

## Features

### Members
- **Log in with PayPal** (OpenID Connect): your PayPal personal account is your Unitus account
- **Onboarding:** join with an invite code or link (including chamas already running), pay the joining fee (fee breakdown shown), agree to auto-deductions
- **Several chamas:** join as many as you like and switch between them on the dashboard
- **Dashboard:** your balance, the chama's account number and balance, cycle progress (who has received), next deduction with its time and a "make sure it's in your PayPal" reminder, locked rules
- **Rounds:** every round's recipient, pot and PayPal payout status
- **Chama accounts and statement:** the pot and each member's savings and joining-fee accounts, a running statement, and a **CSV download**
- **Check my PayPal balance:** a link to PayPal's own account page (PayPal doesn't share personal balances with apps)
- **Analytics** (AG Studio): money in by round, contributions by member and by country (from PayPal), members by country
- **Partner offers** sized to your payout

### Chama creators
- **Start a chama** in five steps with a live preview: frequency, first round time, money per round, savings and loans. Then share the invite code via copy, WhatsApp or the share sheet
- **Join as a member too** from the same account
- Rules **lock on creation**; deletion only when the chama is clean

### Unitus operators (`/dashboard/wallet`)
- Wallet balance from the ledger next to **PayPal's live balance**, with the difference flagged
- Number of chamas (running / not started / closed), members, money held for chamas, PayPal fees and what Unitus covered
- Every chama's account and balance, and the **transaction history** across all chamas (AG Grid)
- Read-only; visible only to emails in `UNITUS_OPERATOR_EMAILS`

### Businesses (`/business`)
- Partner application and dashboard: offers, views, sales, earnings after the referral fee, demand by payout size

### Also
- Landing page with an auto-playing product tour of real screenshots
- Light, dark and system themes; responsive to phone width; respects *reduce motion*

---

## PayPal integration

Uses PayPal's **v6 Web SDK** in the browser, with every order created and captured on the server.

| What | How |
|---|---|
| Log in | Log in with PayPal (personal accounts) |
| Joining fee | One-time payment that also **saves the member's PayPal** (vault) for automatic charges |
| Round deduction | Charged to the saved PayPal with no approval step, by the scheduler when a round is due |
| Payout | The pot is sent to the recipient's PayPal with the **Payouts API** |
| Partner offer | Checkout for the offer price or deposit |
| Wallet balance | Balances API on the Unitus business account |

Amounts are always calculated on the server, from the chama's locked rules. Every POST sends a `PayPal-Request-Id`, so retries can't charge twice; a round deduction uses one fixed id per round and member, and a payout uses the round as its batch id. 429 and 5xx responses are retried with backoff, and errors log PayPal's `debug_id`.

---

## Project structure

```
unitus/
├── app/                                  Routes (Next.js App Router)
│   ├── page.tsx                          Landing page
│   ├── (auth)/login, signup              Log in with PayPal
│   ├── onboarding/                       Join a chama, pay the joining fee, set up deductions
│   ├── groups/new/                       Start a chama
│   ├── join/[code]/                      Invite links → /onboarding?code=…
│   ├── dashboard/
│   │   ├── page.tsx                      Member / admin overview, accounts, statement, records
│   │   ├── analytics/                    AG Studio analytics
│   │   ├── offers/                       Partner offers
│   │   └── wallet/                       Unitus wallet (operators only)
│   ├── business/                         Partner sign-up and dashboard
│   ├── paypal/return/                    Return page after PayPal approval
│   └── api/
│       ├── auth/                         paypal/login, paypal/callback, logout, me
│       ├── chamas/                       create, lookup, join, [chamaId]/statement (CSV)
│       ├── paypal/                       client-token, orders, orders/[id]/capture
│       └── cron/tick/                    Scheduler tick: runs due rounds (CRON_SECRET)
├── components/
│   ├── landing/                          Landing sections, device frames, product tour
│   ├── dashboard/                        Dashboard cards, AG Grid tables, nav, leave / rules
│   ├── create/  onboarding/              Create-chama and join flows
│   ├── auth/  paypal/                    Login button, user menu, PayPal pay button
│   ├── analytics/  marketplace/          AG Studio report, offers, partner portal
│   ├── illustrations/  theme/            Artwork, theme toggle
│   └── ui/                               shadcn/ui components
├── lib/                                  Logic; server-only except auth/use-me.ts and paypal/client.ts
│   ├── paypal/
│   │   ├── server.ts                     REST client: token cache, request ids, retries
│   │   ├── orders.ts                     Joining fee, offers, round deduction
│   │   ├── payouts.ts                    Payouts to each round's recipient
│   │   ├── identity.ts                   Log in with PayPal
│   │   └── client.ts                     Browser v6 SDK loader
│   ├── auth/
│   │   ├── session.ts                    Signed session cookie
│   │   ├── redirects.ts                  Safe redirects, 127.0.0.1 in dev
│   │   ├── operator.ts                   Who can see the Unitus wallet
│   │   └── use-me.ts                     Current member (client hook)
│   ├── db.ts                             Supabase client, members, saved PayPal, payments
│   ├── chamas.ts                         Create / look up / join chamas, invite codes
│   ├── rounds.ts                         The merry-go-round engine: draw, charge, pay out
│   ├── schedule.ts                       Frequencies and round timing
│   ├── dashboard.ts                      Dashboard data for one chama
│   ├── ledger.ts                         Chama accounts, posting, statements
│   ├── wallet.ts                         Unitus wallet across all chamas
│   ├── fees.ts                           Fee gross-up
│   ├── chama.ts                          Rule maths: deductions, loans, exit, formatting
│   └── marketplace.ts, marketplace-data.ts   Offer matching, sample catalogue
├── supabase/migrations/                  Run in order in the Supabase SQL Editor
│   ├── 0001_members_and_payments.sql     Members, saved PayPal, payments
│   ├── 0002_chamas.sql                   Chamas, memberships, rule lock, create / join
│   ├── 0003_admin_is_not_a_member.sql    (superseded by 0009)
│   ├── 0004_creator_accounts_are_separate.sql   (superseded by 0009)
│   ├── 0005_payment_fees.sql             Principal, fee charged, PayPal fee, net
│   ├── 0006_ledger.sql                   Double-entry ledger and chama accounts
│   ├── 0007_member_country.sql           Member country (from PayPal) for analytics
│   ├── 0008_rounds.sql                   Frequencies, start time, rounds, payouts
│   └── 0009_open_chama_creation.sql      Anyone can create; creators can join
├── supabase/reset-sandbox.sql            Sandbox only: wipe chamas and money records
├── scripts/
│   ├── scheduler.mjs                     Local scheduler: calls the tick every minute
│   ├── ledger-backfill.mjs               Post existing payments to the ledger
│   ├── backfill-countries.mjs            Fill in members' country from PayPal
│   └── capture-screens.py                Re-capture landing-page screenshots
├── docs/payments-architecture.md         Money flow, ledger, roles, compliance
└── proxy.ts                              Sends signed-out visitors to /login
```

---

## Getting started

Requires Node 20+ and pnpm.

```bash
pnpm install
cp .env.example .env      # then fill in the values below
pnpm dev                  # open http://127.0.0.1:3000
```

### Environment variables (`.env`)

| Variable | Required | What it is |
|---|---|---|
| `PAYPAL_CLIENT_ID` | yes | Client ID of the Unitus app (developer.paypal.com → Apps & Credentials) |
| `PAYPAL_CLIENT_SECRET` | yes | App secret. Server only |
| `PAYPAL_ENVIRONMENT` | yes | `sandbox` or `production` |
| `SESSION_SECRET` | yes | 32+ random characters that sign the login cookie. Changing it logs everyone out |
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SECRET_KEY` | yes | Supabase secret key. Server only; never prefix with `NEXT_PUBLIC_` |
| `CRON_SECRET` | yes | Long random string that protects the scheduler endpoint (`openssl rand -hex 32`) |
| `UNITUS_OPERATOR_EMAILS` | production | Comma-separated staff emails who can view the Unitus wallet. Empty in development = everyone signed in (with a warning) |
| `PAYPAL_FEE_PERCENT`, `PAYPAL_FEE_FIXED` | no | Fee gross-up rate (default 3.9% + $0.30) |
| `PAYPAL_LOGIN_REDIRECT_URI` | no | Override the Log in with PayPal return URL |
| `PAYPAL_DEMO_MERCHANT_EMAIL` | no | Sandbox business account that receives partner-offer payments |
| `PAYPAL_DOMAINS` | production | Your site's domain, for PayPal client tokens |
| `NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` | for analytics | AG Studio licence (checked in the browser) |

`.env` is git-ignored. Never commit real keys.

### Set up the database (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run each file in `supabase/migrations/` **in order** (0001 → 0009).
3. Put the project URL and secret key in `.env`.
4. If you already had payments before 0006: `node --env-file=.env scripts/ledger-backfill.mjs`.

Supabase is only used from the server. Row level security is on with no policies, so the public key can't read anything.

### Set up Log in with PayPal
1. developer.paypal.com → **Apps & Credentials** → your sandbox app → **Features** → tick **Log in with PayPal** → **Advanced settings**.
2. Return URL: `http://127.0.0.1:3000/api/auth/paypal/callback`. PayPal won't accept `localhost`, so in development the app switches to `127.0.0.1` automatically.
3. Request **Full name** and **Email**. For testing, the privacy policy and user agreement URLs can be `https://example.com`.

Log in with a sandbox **personal** account. PayPal business accounts can't use Log in with PayPal.

### Run the scheduler
Rounds only run while the scheduler is calling the app. Locally, keep it running in a second terminal next to `pnpm dev`:

```bash
pnpm scheduler                                # checks every minute
pnpm scheduler --once --force <chama id>      # sandbox: run that chama's next round now
```

When deployed, have a cron service `POST /api/cron/tick` every minute with `Authorization: Bearer $CRON_SECRET`.

### Try it end to end (sandbox)
1. Create **two sandbox personal accounts** in the PayPal developer dashboard.
2. Log in as the first, go to **New chama**, choose **Every 30 minutes** and a first round a few minutes ahead. Then **Join as a member too** and pay the joining fee.
3. Log out, log in as the second, open the invite link (or `/onboarding`), and pay the joining fee.
4. With `pnpm scheduler` running, watch the round at its start time: the draw, each charge and the payout. On `/dashboard`, see the **Rounds** tab, the chama accounts and the statement.
5. Open `/dashboard/wallet` to see the Unitus wallet and compare it with PayPal's real balance.

To start over in the sandbox, run `supabase/reset-sandbox.sql`. It keeps logins and wipes chamas, payments and the ledger.

### Scripts

| Command | |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm lint` | ESLint |
| `pnpm scheduler` | Run due rounds every minute (`--once`, `--force <chama id>`, `--url`) |
| `node --env-file=.env scripts/ledger-backfill.mjs` | Post existing payments to the ledger (safe to re-run) |
| `node --env-file=.env scripts/backfill-countries.mjs` | Fill in members' country from their PayPal payments |
| `python3 scripts/capture-screens.py --base-url http://127.0.0.1:3000` | Re-capture landing-page screenshots (needs Chrome and Pillow) |

---

## Roadmap

- **Reminder emails** before each deduction, and a "pay this round manually" option after a declined charge
- **Webhooks:** confirm captures that complete later (needs a public HTTPS URL)
- **Daily reconciliation** with alerts when PayPal and the ledger disagree
- **Loans** in the database, savings share-out, leave and delete actions
- **Before going live:** holding money for many groups usually needs a licence (e.g. a payment-service provider licence) and PayPal's approval; the referral-fee split needs PayPal's multiparty onboarding

## Tech stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Supabase (Postgres) · PayPal v6 Web SDK + REST · Tailwind CSS v4 · shadcn/ui (Base UI) · AG Grid Community · AG Studio · next-themes · lucide-react
