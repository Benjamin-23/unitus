import type { Metadata } from "next";
import { CalendarClockIcon, HandCoinsIcon, LockIcon, PiggyBankIcon, RefreshCwIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LedgerGrid, MembersGrid, ScheduleGrid } from "@/components/dashboard/grids";
import { ChamaRules } from "@/components/dashboard/chama-rules";
import { LeaveChama } from "@/components/dashboard/leave-chama";
import { RequestLoan } from "@/components/dashboard/request-loan";
import { loanBalance, loanLimit, money, monthlyDeduction } from "@/lib/chama";
import { CHAMA_ACCOUNT_BALANCE, DEMO_ACCOUNT, DEMO_GROUP, DEMO_USER, GROUP_SNAPSHOT, MEMBERS } from "@/lib/mock-data";
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

export default function DashboardPage() {
  const group = DEMO_GROUP;
  const account = DEMO_ACCOUNT;
  const deduction = monthlyDeduction(group, account);
  const { limit, available } = loanLimit(group, account);
  const balance = loanBalance(account.loan);
  const paidThisMonth = MEMBERS.filter((m) => m.octoberStatus === "Paid").length;

  return (
    <>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{DEMO_USER.name.split(" ")[0]}</h1>
          </div>
          <div className="flex gap-2">
            <RequestLoan />
            <LeaveChama />
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={PiggyBankIcon} label="Your savings" value={money(account.savings + account.lockedJoiningFee)}>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <LockIcon className="size-3.5" /> {money(account.lockedJoiningFee)} joining fee locked until you leave
            </p>
            <p className="text-sm text-muted-foreground">Shared out {group.shareOut === "year-end" ? "at year end" : "mid-year"}</p>
          </Stat>

          <Stat icon={RefreshCwIcon} label="Merry-go-round" value={`${group.cycle.drawsCompleted} of ${group.memberCount} drawn`}>
            <Progress value={(group.cycle.drawsCompleted / group.memberCount) * 100} className="[&_[data-slot=progress-track]]:h-2" />
            <p className="text-sm text-muted-foreground">
              {account.hasReceivedPayout ? "You've received your payout this cycle." : (
                <>
                  <span className="font-medium text-primary">You&apos;re still in the draw.</span> October: {paidThisMonth}/{group.memberCount} paid
                </>
              )}
            </p>
          </Stat>

          <Stat icon={HandCoinsIcon} label="Loan balance" value={money(balance)}>
            <p className="text-sm text-muted-foreground">
              {money(available)} more available (limit {money(limit)})
            </p>
            <p className="text-sm text-muted-foreground">
              {account.loan ? `${account.loan.instalmentsPaid} of ${account.loan.months} instalments paid` : "No active loan"}
            </p>
          </Stat>

          <Stat icon={CalendarClockIcon} label="Next auto-deduction" value={money(deduction.total)} className="bg-band text-band-foreground [&_[data-slot=card-description]]:text-band-foreground/75">
            <p className="text-sm text-band-foreground/80">1 Nov 2026 from your PayPal</p>
            <p className="text-xs text-band-foreground/70">
              {money(deduction.contribution)} contribution · {money(deduction.savings)} savings · {money(deduction.loanRepayment)} loan
            </p>
          </Stat>
        </section>

        <ChamaRules snapshot={GROUP_SNAPSHOT} accountBalance={CHAMA_ACCOUNT_BALANCE} />

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Chama records</CardTitle>
            <CardDescription>Sort, filter and resize any column. Every row matches a PayPal transaction.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="schedule" className="gap-5">
              <TabsList className="h-10! w-full max-w-md rounded-xl p-1 sm:w-fit">
                <TabsTrigger value="schedule" className="px-4">Auto-deductions</TabsTrigger>
                <TabsTrigger value="ledger" className="px-4">My ledger</TabsTrigger>
                <TabsTrigger value="members" className="px-4">Members</TabsTrigger>
              </TabsList>
              <TabsContent value="schedule">
                <ScheduleGrid />
              </TabsContent>
              <TabsContent value="ledger">
                <LedgerGrid />
              </TabsContent>
              <TabsContent value="members">
                <MembersGrid />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
