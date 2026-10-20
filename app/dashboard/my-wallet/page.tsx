import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBagIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { WithdrawForm } from "@/components/wallet/withdraw-form";
import { getSession } from "@/lib/auth/session";
import { money } from "@/lib/chama";
import { getMemberWallet, MIN_WITHDRAWAL, type WithdrawalStatus } from "@/lib/member-wallet";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My wallet · Unitus" };

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";

const STATUS: Record<WithdrawalStatus, { label: string; variant: "secondary" | "outline" | "destructive" }> = {
  requested: { label: "Sending", variant: "outline" },
  sending: { label: "On its way", variant: "outline" },
  sent: { label: "Sent", variant: "secondary" },
  failed: { label: "Returned to wallet", variant: "destructive" },
};

async function MyWallet() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/my-wallet");
  const w = await getMemberWallet(session.memberId);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Pots you win land here</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">My wallet</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {w.number && (
            <Badge variant="outline" className="gap-1 font-mono">
              <WalletIcon className="size-3" /> {w.number}
            </Badge>
          )}
          <LiveRefresh pending={w.pending > 0} dueAt={null} />
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="rounded-3xl bg-band text-band-foreground">
          <CardHeader>
            <CardDescription className="text-band-foreground/70">Available</CardDescription>
            <CardTitle className="font-heading text-5xl font-semibold tracking-tight">{money(w.balance)}</CardTitle>
            {w.pending > 0 && <p className="text-sm text-band-foreground/80">{money(w.pending)} on its way to your PayPal</p>}
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-background p-4 text-foreground">
              <WithdrawForm balance={w.balance} min={MIN_WITHDRAWAL} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <ShoppingBagIcon className="size-5" />
            </div>
            <CardTitle className="font-heading text-xl">Spend with partners</CardTitle>
            <CardDescription>
              Soon you&apos;ll be able to pay partner businesses straight from your wallet, with member-only deals. Coming next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/offers" className={cn(buttonVariants({ variant: "outline" }))}>
              See partner offers
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Activity</CardTitle>
            <CardDescription>Pots credited and money withdrawn</CardDescription>
          </CardHeader>
          <CardContent>
            {w.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet. When you&apos;re drawn in a round, the whole pot is credited here.</p>
            ) : (
              <ul className="divide-y">
                {w.activity.map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.description}</p>
                      <p className="text-xs text-muted-foreground">{dateTime(a.date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("font-semibold tabular-nums", a.amount > 0 ? "text-primary" : "")}>
                        {a.amount > 0 ? "+" : "−"}
                        {money(Math.abs(a.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">Balance {money(a.balance)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Withdrawals</CardTitle>
            <CardDescription>To your PayPal</CardDescription>
          </CardHeader>
          <CardContent>
            {w.withdrawals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No withdrawals yet.</p>
            ) : (
              <ul className="divide-y">
                {w.withdrawals.map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium tabular-nums">{money(x.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {dateTime(x.date)}
                        {x.detail ? ` · ${x.detail}` : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS[x.status].variant}>{STATUS[x.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function WalletSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="h-16 w-48 animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}

export default function MyWalletPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <Suspense fallback={<WalletSkeleton />}>
        <MyWallet />
      </Suspense>
    </main>
  );
}
