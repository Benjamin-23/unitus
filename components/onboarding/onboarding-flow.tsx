"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  CheckIcon,
  Loader2Icon,
  LockIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PayPalButton, PayPalMark } from "@/components/auth/paypal-button";
import { money, monthlyDeduction, ordinal } from "@/lib/chama";
import { DEMO_GROUP, DEMO_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const STEPS = ["Connect PayPal", "Join a chama", "Joining fee", "Auto-deductions"] as const;

// TODO(backend): each of these becomes a real call (PayPal vaulting, group lookup, order capture, billing agreement).
const fakeRequest = (ms = 1100) => new Promise((r) => setTimeout(r, ms));

function Stepper({ current }: { current: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-col gap-2">
            <div className={cn("h-1.5 rounded-full bg-muted transition-colors", (done || active) && "bg-primary", active && "bg-primary/60")} />
            <span className={cn("hidden items-center gap-1.5 text-xs font-medium sm:flex", active ? "text-foreground" : "text-muted-foreground")}>
              {done && <CheckIcon className="size-3.5 text-primary" />}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", strong && "font-heading text-lg font-semibold")}>{value}</span>
    </div>
  );
}

export function OnboardingFlow() {
  const router = useRouter();
  const viaPayPal = useSearchParams().get("via") === "paypal";
  const [step, setStep] = useState(viaPayPal ? 1 : 0);
  const [busy, setBusy] = useState(false);
  const [paypalConnected, setPaypalConnected] = useState(viaPayPal);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [groupFound, setGroupFound] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [feePaid, setFeePaid] = useState(false);
  const [autoDebit, setAutoDebit] = useState(true);
  const [reminders, setReminders] = useState(true);

  const group = DEMO_GROUP;
  const firstDeduction = monthlyDeduction(group, { savings: 0, lockedJoiningFee: 0, loan: null, hasReceivedPayout: false });

  async function connectPayPal() {
    setBusy(true);
    await fakeRequest();
    setPaypalConnected(true);
    setBusy(false);
  }

  async function findGroup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fakeRequest(700);
    setBusy(false);
    if (code.trim().toUpperCase() !== group.inviteCode) {
      setCodeError(`We couldn't find a chama with that code. Try the demo code ${group.inviteCode}.`);
      setGroupFound(false);
      return;
    }
    setCodeError(null);
    setGroupFound(true);
  }

  async function payFee() {
    setBusy(true);
    await fakeRequest(1400);
    setFeePaid(true);
    setBusy(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <Stepper current={step} />

      {step === 0 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Connect your PayPal account</CardTitle>
            <CardDescription className="text-base">
              Contributions, savings and loan repayments are paid from this account, and your merry-go-round payout lands
              here too.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-3 text-sm">
              {[
                "You log in on PayPal's own page. We never see your password.",
                "You can contribute from any country PayPal supports.",
                "You can disconnect at any time from your settings.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            {paypalConnected ? (
              <Alert className="border-primary/30 bg-secondary/60">
                <BadgeCheckIcon className="text-primary" />
                <AlertTitle>PayPal connected</AlertTitle>
                <AlertDescription>{DEMO_USER.paypalEmail}</AlertDescription>
              </Alert>
            ) : (
              <PayPalButton onClick={connectPayPal} loading={busy}>
                Connect PayPal
              </PayPalButton>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="lg" disabled={!paypalConnected} onClick={() => setStep(1)}>
              Continue <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 1 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Join your chama</CardTitle>
            <CardDescription className="text-base">Enter the invite code your group admin shared with you.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form onSubmit={findGroup} className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={group.inviteCode}
                aria-label="Invite code"
                aria-invalid={!!codeError}
                className="h-11 font-mono uppercase"
              />
              <Button type="submit" size="lg" variant="outline" className="h-11 px-4" disabled={busy || !code.trim()}>
                {busy ? <Loader2Icon className="animate-spin" /> : "Find"}
              </Button>
            </form>
            {codeError && <FieldError>{codeError}</FieldError>}

            {groupFound && (
              <div className="rounded-2xl border bg-secondary/40 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <UsersIcon className="size-5" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.memberCount} members · cycle {group.cycle.startMonth} – {group.cycle.endMonth}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <p className="mb-1 text-sm font-semibold">The group&apos;s rules</p>
                <Row label="Joining fee (locked in your savings)" value={money(group.joiningFee)} />
                <Row label="Merry-go-round contribution" value={`${money(group.monthlyContribution)} / month`} />
                <Row label="Savings" value={`${money(group.monthlySavings)} / month`} />
                <Row label="Savings shared out" value={group.shareOut === "year-end" ? "At year end" : "Mid-year"} />
                <Row label="Loans" value={`Up to ${group.loanMultiplier}× savings at ${group.loanInterestRate}% flat`} />
                <Row label="Auto-deduction day" value={`${ordinal(group.deductionDay)} of each month`} />
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <Link href="/groups/new" className="text-sm font-medium text-primary hover:underline">
              Start a new chama instead
            </Link>
            <Button size="lg" disabled={!groupFound} onClick={() => setStep(2)}>
              Join this chama <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Pay your joining fee</CardTitle>
            <CardDescription className="text-base">
              A one-time {money(group.joiningFee)} payment confirms your PayPal account works and starts your savings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-2xl border p-4">
                <LockIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">Locked in your savings</p>
                  <p className="text-muted-foreground">It isn&apos;t a charge. The money stays yours and counts towards your loan limit.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border p-4">
                <RefreshCwIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-semibold">Returned when you leave</p>
                  <p className="text-muted-foreground">
                    You can withdraw it only when you leave, and only after the merry-go-round has gone all the way round.
                  </p>
                </div>
              </div>
            </div>

            {feePaid ? (
              <Alert className="border-primary/30 bg-secondary/60">
                <BadgeCheckIcon className="text-primary" />
                <AlertTitle>{money(group.joiningFee)} received. Your PayPal is verified.</AlertTitle>
                <AlertDescription>It&apos;s now in your locked savings.</AlertDescription>
              </Alert>
            ) : (
              <>
                <Field orientation="horizontal">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
                  <FieldContent>
                    <FieldLabel htmlFor="agree">I understand the joining fee is locked until I leave the chama</FieldLabel>
                    <FieldDescription>
                      Leaving is only possible once the current cycle ends ({group.cycle.endMonth}). Any loan balance is
                      deducted from what you withdraw.
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <PayPalButton onClick={payFee} loading={busy} disabled={!agreed}>
                  Pay {money(group.joiningFee)} with PayPal
                </PayPalButton>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button size="lg" disabled={!feePaid} onClick={() => setStep(3)}>
              Continue <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Set up automatic deductions</CardTitle>
            <CardDescription className="text-base">
              On the {ordinal(group.deductionDay)} of every month, Unitus collects your share from PayPal, so you never miss a draw.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-2xl border p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarClockIcon className="size-4 text-primary" /> Each month
              </div>
              <Row label="Merry-go-round contribution" value={money(firstDeduction.contribution)} />
              <Row label="Savings" value={money(firstDeduction.savings)} />
              <Row label="Loan repayment" value="Only while you have a loan" />
              <Separator className="my-2" />
              <Row label="Total from PayPal" value={money(firstDeduction.total)} strong />
            </div>

            <div className="flex flex-col gap-4">
              <Field orientation="horizontal" className="justify-between rounded-2xl border p-4">
                <FieldContent>
                  <FieldLabel htmlFor="auto-debit" className="flex items-center gap-2">
                    <PayPalMark className="size-4" /> Allow automatic PayPal deductions
                  </FieldLabel>
                  <FieldDescription>Required to stay in the draw. You can cancel any time by leaving the chama.</FieldDescription>
                </FieldContent>
                <Switch id="auto-debit" checked={autoDebit} onCheckedChange={setAutoDebit} />
              </Field>
              <Field orientation="horizontal" className="justify-between rounded-2xl border p-4">
                <FieldContent>
                  <FieldLabel htmlFor="reminders">Remind me 3 days before</FieldLabel>
                  <FieldDescription>An email with the amount, so the money is ready in your PayPal.</FieldDescription>
                </FieldContent>
                <Switch id="reminders" checked={reminders} onCheckedChange={setReminders} />
              </Field>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              size="lg"
              disabled={!autoDebit || busy}
              onClick={async () => {
                setBusy(true);
                await fakeRequest(800);
                router.push("/dashboard");
              }}
            >
              {busy && <Loader2Icon className="animate-spin" />}
              Go to my dashboard
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
