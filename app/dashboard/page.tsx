import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClockIcon, CoinsIcon, DownloadIcon, LandmarkIcon, LockIcon, PiggyBankIcon, PlusIcon, RefreshCwIcon, UsersIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LedgerGrid, MembersGrid, RoundsGrid, ScheduleGrid, StatementGrid } from "@/components/dashboard/grids";
import { ChamaRules } from "@/components/dashboard/chama-rules";
import { LeaveChama } from "@/components/dashboard/leave-chama";
import { MyChamas } from "@/components/dashboard/my-chamas";
import { getSession } from "@/lib/auth/session";
import { PAYPAL_ACCOUNT_URL } from "@/lib/paypal/server";
import { money } from "@/lib/chama";
import { getChamaDashboard, listDashboardChamas } from "@/lib/dashboard";
import { FREQUENCIES, formatDue } from "@/lib/schedule";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard · Unitus" };

function Stat({
  icon: Icon,
  label,
  value,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 rounded-3xl", className)}>
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


async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");
  const params = await searchParams;
  const selectedId = typeof params.chama === "string" ? params.chama : undefined;

  const chamas = await listDashboardChamas(session.memberId);
  const firstName = session.name?.split(" ")[0] ?? "there";

  const header = (
    <div>
      <p className="text-sm text-muted-foreground">Welcome back,</p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">{firstName}</h1>
    </div>
  );

  if (chamas.length === 0) {
    return (
      <>
        {header}
        <Card className="rounded-3xl">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <UsersIcon className="size-8 text-muted-foreground" />
            <div>
              <p className="font-heading text-xl font-semibold">You&apos;re not in a chama yet</p>
              <Note>Join one with an invite link or code, or start your own. You can be in as many chamas as you like.</Note>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/onboarding" className={buttonVariants({ size: "lg" })}>
                Join with an invite code
              </Link>
              <Link href="/groups/new" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <PlusIcon data-icon="inline-start" /> Start a chama
              </Link>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  const selected = chamas.find((c) => c.id === selectedId) ?? chamas[0];
  const d = await getChamaDashboard(selected.id, session.memberId);
  if (!d) redirect("/dashboard");

  const { chama, you, pool, cycle, next, members, frequency } = d;
  const isAdmin = d.role === "admin";
  const started = d.rounds.length > 0;
  const lastRound = d.rounds[0];
  const when = (iso: string) => formatDue(iso, frequency);
  const paidLastRound = members.filter((m) => m.feePaid && m.paidLastRound).length;
  // A member may leave once everyone in the current cycle has received.
  const drawsRemaining = Math.max(0, cycle.members - cycle.received);
  const fullPot = Number(chama.monthly_contribution) * Math.max(1, d.activeMembers - 1);

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        {header}
        {!isAdmin && you && (
          <LeaveChama
            chamaName={chama.name}
            savings={you.savings}
            joiningFee={you.lockedJoiningFee}
            drawsRemaining={drawsRemaining}
            cycleEnd={`the end of cycle ${cycle.number}`}
          />
        )}
      </div>

      <MyChamas />

      {chamas.length > 1 && (
        <nav aria-label="Choose a chama" className="flex flex-wrap gap-2">
          {chamas.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard?chama=${c.id}`}
              aria-current={c.id === chama.id ? "page" : undefined}
              className={cn(buttonVariants({ variant: c.id === chama.id ? "default" : "outline" }), "h-9 rounded-full")}
            >
              {c.name}
              <span className="text-xs opacity-75">{c.label}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">{chama.name}</h2>
        <Badge variant="secondary">
          {d.isCreator && !isAdmin ? "You're the admin and a member" : isAdmin ? "You're the admin" : "You're a member"}
        </Badge>
        <Badge variant="outline">{chama.status === "open" ? "Not started" : chama.status === "active" ? "Running" : "Closed"}</Badge>
        <Badge variant="outline" className="gap-1">
          <RefreshCwIcon className="size-3" /> {FREQUENCIES[frequency].label}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <LockIcon className="size-3" /> Rules locked
        </Badge>
        <Badge variant="outline" className="gap-1 font-mono">
          <LandmarkIcon className="size-3" /> {d.account.number}
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isAdmin ? (
          <>
            <Stat icon={UsersIcon} label="Members" value={`${members.length} of ${chama.member_limit}`}>
              <Progress value={(members.length / chama.member_limit) * 100} className="[&_[data-slot=progress-track]]:h-2" />
              <Note>
                {d.activeMembers} paid the joining fee{d.activeMembers < 2 ? " · needs 2 to start" : ""}
                {members.length < chama.member_limit ? " · still open to join" : " · full"}
              </Note>
            </Stat>
            <Stat icon={WalletIcon} label="Chama account balance" value={money(pool.balance)}>
              <Note>
                {money(pool.joiningFees)} joining fees · {money(pool.savings)} savings · {money(pool.contributions - pool.payouts)} in the pot
              </Note>
              <Note className="text-xs">
                {money(pool.payouts)} paid out · members paid {money(pool.feesCharged)} in PayPal fees on top
              </Note>
            </Stat>
            <Stat
              icon={CalendarClockIcon}
              label={started ? `Round ${lastRound.number} collection` : "Collections"}
              value={started ? `${paidLastRound} of ${d.activeMembers} paid` : "Not started"}
            >
              <Note>{next ? `${next.waiting ? "Waiting for 2 paid members · " : ""}Next round: ${when(next.date)}` : "This chama is closed"}</Note>
            </Stat>
          </>
        ) : (
          <>
            <Stat icon={PiggyBankIcon} label="Your balance" value={money(you?.balance ?? 0)}>
              <Note className="flex items-center gap-1.5">
                <LockIcon className="size-3.5" /> {money(you?.lockedJoiningFee ?? 0)} joining fee, locked until you leave
              </Note>
              <Note>
                {money(you?.savings ?? 0)} savings, shared out {chama.share_out === "year-end" ? "at year end" : "mid-year"}
              </Note>
              <Note className="text-xs">PayPal fees you&apos;ve paid on top: {money(you?.feesPaid ?? 0)}</Note>
            </Stat>
            <Stat icon={CoinsIcon} label="Contributions paid" value={money(you?.contributed ?? 0)}>
              <Note>
                {members.find((m) => m.isYou)?.rounds ?? 0} rounds ·{" "}
                {started ? (you?.paidLastRound ? `round ${lastRound.number} paid` : `round ${lastRound.number} not paid`) : "not started yet"}
              </Note>
              <Note>{you?.receivedThisCycle ? "You've received the pot this cycle" : "You haven't received the pot this cycle yet"}</Note>
              {!you?.feePaid && (
                <Link href={`/onboarding?code=${chama.invite_code}`} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
                  Pay joining fee
                </Link>
              )}
            </Stat>
          </>
        )}

        <Stat icon={RefreshCwIcon} label={`Merry-go-round · cycle ${cycle.number}`} value={`${cycle.received} of ${cycle.members} received`}>
          <Progress value={cycle.members ? (cycle.received / cycle.members) * 100 : 0} className="[&_[data-slot=progress-track]]:h-2" />
          <Note>
            {lastRound
              ? `Last: ${lastRound.recipient}${lastRound.isYou ? " (you)" : ""}${lastRound.pot ? ` · ${money(lastRound.pot)}` : ""}`
              : `First round ${when(chama.starts_at)} once 2 members have paid`}
          </Note>
          <Note className="text-xs">Pot now about {money(fullPot)} each round with {d.activeMembers} paid members</Note>
        </Stat>

        {!isAdmin && (
          <Stat
            icon={CalendarClockIcon}
            label={next ? `Next auto-deduction · round ${next.number}` : "Next auto-deduction"}
            value={next && you?.feePaid ? money(next.total) : "—"}
            className="bg-band text-band-foreground [&_[data-slot=card-description]]:text-band-foreground/75"
          >
            <p className="text-sm text-band-foreground/80">
              {!next ? "No more rounds" : !you?.feePaid ? "Pay the joining fee to take part" : `${when(next.date)} from your PayPal${next.waiting ? " (once 2 members have paid)" : ""}`}
            </p>
            {next && you?.feePaid && (
              <>
                <p className="text-xs text-band-foreground/70">
                  {money(next.contribution)} contribution · {money(next.savings)} savings · {money(next.fee)} PayPal fee. If you&apos;re drawn,
                  only {money(next.ifDrawn)}.
                </p>
                <p className="rounded-xl bg-band-foreground/10 px-3 py-2 text-xs text-band-foreground/90">
                  Make sure {money(next.total)} is available in your PayPal by {when(next.date)}.{" "}
                  <a href={PAYPAL_ACCOUNT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                    Check my PayPal balance ↗
                  </a>
                </p>
              </>
            )}
          </Stat>
        )}
      </section>

      <ChamaRules
        chama={chama}
        cycle={cycle}
        accountBalance={pool.balance}
        canDelete={d.isCreator}
        snapshot={{
          memberCount: cycle.members,
          membersPaidOut: cycle.received,
          savingsHeld: pool.joiningFees + pool.savings,
          loansOutstanding: 0,
          pendingDeductions: started ? d.activeMembers - paidLastRound : 0,
        }}
      />

      {d.account.fromLedger && d.account.accounts.length > 0 && (
        <Card className="rounded-3xl">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="font-heading text-xl">Chama accounts</CardTitle>
              <CardDescription>
                Account {d.account.number} inside Unitus. The money is held in the Unitus PayPal pool; these accounts record whose it is.
              </CardDescription>
            </div>
            <p className="shrink-0 text-right">
              <span className="block text-xs text-muted-foreground">Total</span>
              <span className="font-heading text-2xl font-semibold">{money(pool.balance)}</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {d.account.accounts
                .sort((a, b) => (a.kind === "chama_pot" ? -1 : b.kind === "chama_pot" ? 1 : a.name.localeCompare(b.name)))
                .map((a) => (
                  <li key={a.number} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{a.number}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{money(a.balance)}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
          <CardTitle className="font-heading text-xl">Chama records</CardTitle>
          <CardDescription>Every member sees the same records. Each payment row matches a PayPal transaction.</CardDescription>
          </div>
          {d.account.fromLedger && (
            <a href={`/api/chamas/${chama.id}/statement`} className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
              <DownloadIcon data-icon="inline-start" /> Statement (CSV)
            </a>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={d.account.fromLedger ? "statement" : "ledger"} className="gap-5">
            <TabsList className="h-10! w-full max-w-2xl rounded-xl p-1 sm:w-fit">
              {d.account.fromLedger && (
                <TabsTrigger value="statement" className="px-4">Statement</TabsTrigger>
              )}
              <TabsTrigger value="rounds" className="px-4">Rounds</TabsTrigger>
              <TabsTrigger value="ledger" className="px-4">Payments</TabsTrigger>
              <TabsTrigger value="members" className="px-4">Members</TabsTrigger>
              <TabsTrigger value="schedule" className="px-4">Upcoming</TabsTrigger>
            </TabsList>
            <TabsContent value="statement">
              <StatementGrid rows={d.account.statement} />
            </TabsContent>
            <TabsContent value="rounds">
              <RoundsGrid rows={d.rounds} />
            </TabsContent>
            <TabsContent value="ledger">
              <LedgerGrid rows={d.ledger} />
            </TabsContent>
            <TabsContent value="members">
              <MembersGrid rows={members} />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleGrid rows={d.schedule} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy>
      <div className="h-16 w-48 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
