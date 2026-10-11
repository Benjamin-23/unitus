import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlertTriangleIcon, BuildingIcon, CheckCircle2Icon, LandmarkIcon, ReceiptIcon, ShieldAlertIcon, UsersIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletChamasGrid, WalletTransactionsGrid } from "@/components/dashboard/grids";
import { isOperator, operatorAllowlistConfigured } from "@/lib/auth/operator";
import { getSession } from "@/lib/auth/session";
import { money } from "@/lib/chama";
import { getMember } from "@/lib/db";
import { PAYPAL_ENV } from "@/lib/paypal/server";
import { getWallet } from "@/lib/wallet";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Unitus wallet · Unitus" };

function Stat({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-3 rounded-3xl">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" />
        </div>
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="font-heading text-3xl font-semibold tracking-tight">{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}

const Note = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
);

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

async function Wallet() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/wallet");
  const member = await getMember(session.memberId);
  // Not an operator: behave as if the page doesn't exist.
  if (!isOperator(member?.email)) notFound();

  const w = await getWallet();
  const { ledger, paypal, counts, fees } = w;
  const difference = paypal.balance === null ? null : Math.round((paypal.balance - ledger.pool) * 100) / 100;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Operator view · read-only</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Unitus wallet</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 font-mono">
            <LandmarkIcon className="size-3" /> UNT-POOL
          </Badge>
          <Badge variant="outline" className="capitalize">
            PayPal {PAYPAL_ENV}
          </Badge>
        </div>
      </div>

      {!operatorAllowlistConfigured() && (
        <div className="flex items-start gap-3 rounded-2xl border border-clay/40 bg-clay/10 p-4 text-sm">
          <ShieldAlertIcon className="mt-0.5 size-4 shrink-0 text-clay" />
          <p>
            Every signed-in account can see this page because <code className="font-mono">UNITUS_OPERATOR_EMAILS</code> isn&apos;t set. That&apos;s
            only allowed in development; in production the page is closed until you list your staff emails.
          </p>
        </div>
      )}

      {/* The wallet balance, and whether it matches PayPal. */}
      <Card className="rounded-3xl bg-band text-band-foreground">
        <CardContent className="grid gap-6 py-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-band-foreground/70">Wallet balance (ledger)</p>
            <p className="font-heading text-5xl font-semibold tracking-tight">{money(ledger.pool)}</p>
            <p className="text-sm text-band-foreground/70">
              {money(ledger.heldForChamas)} held for chamas{ledger.operating !== 0 && <> · {money(ledger.operating)} Unitus operating</>}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-band-foreground/70">PayPal actual balance</p>
            <p className="font-heading text-3xl font-semibold">{paypal.balance === null ? "—" : money(paypal.balance)}</p>
            <p className="text-xs text-band-foreground/70">
              {paypal.error ? `Couldn't reach PayPal: ${paypal.error}` : paypal.asOf ? `As of ${dateTime(paypal.asOf)}` : ""}
              {paypal.available !== null && paypal.available !== paypal.balance && <> · {money(paypal.available)} available</>}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-band-foreground/70">Reconciliation</p>
            {difference === null ? (
              <p className="text-sm">Not checked</p>
            ) : difference === 0 ? (
              <p className="flex items-center gap-2 font-heading text-xl font-semibold">
                <CheckCircle2Icon className="size-5" /> Matches
              </p>
            ) : (
              <>
                <p className="flex items-center gap-2 font-heading text-xl font-semibold">
                  <AlertTriangleIcon className="size-5" /> {difference > 0 ? "+" : "−"}
                  {money(Math.abs(difference))}
                </p>
                <p className="text-xs text-band-foreground/70">
                  {difference > 0
                    ? "PayPal holds more than the ledger records (e.g. sandbox starting balance or payments from before the ledger)."
                    : "PayPal holds less than the ledger records. Money left the account outside Unitus: investigate."}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={BuildingIcon} label="Chamas" value={String(counts.chamas)}>
          <Note>
            {counts.open} open · {counts.active} full{counts.closed > 0 && <> · {counts.closed} closed</>}
          </Note>
        </Stat>
        <Stat icon={UsersIcon} label="Members across chamas" value={String(counts.members)}>
          <Note>Admins aren&apos;t counted; they can&apos;t be members.</Note>
        </Stat>
        <Stat icon={WalletIcon} label="Held for chamas" value={money(ledger.heldForChamas)}>
          <Note>Pots, savings and locked joining fees.</Note>
        </Stat>
        <Stat icon={ReceiptIcon} label="PayPal fees" value={money(fees.takenByPayPal)}>
          <Note>
            {money(fees.chargedToMembers)} charged to members · Unitus covered {money(Math.max(0, -ledger.operating))}
          </Note>
        </Stat>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Chamas</CardTitle>
          <CardDescription>Every chama&apos;s account inside Unitus and the balance it holds in the pool.</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletChamasGrid rows={w.chamas} />
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Transaction history</CardTitle>
          <CardDescription>
            Every ledger transaction across all chamas, newest first. Into pool = what PayPal deposited; To chama = what the chama was credited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletTransactionsGrid rows={w.transactions} />
        </CardContent>
      </Card>
    </>
  );
}

function WalletSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="h-16 w-56 animate-pulse rounded-2xl bg-muted" />
      <div className="h-44 animate-pulse rounded-3xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <Suspense fallback={<WalletSkeleton />}>
        <Wallet />
      </Suspense>
    </main>
  );
}
