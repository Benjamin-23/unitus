"use client";

import { useEffect, useState } from "react";
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
import { PayPalMark } from "@/components/auth/paypal-button";
import { PayPalPayButton, type CaptureResult } from "@/components/paypal/paypal-pay-button";
import { money } from "@/lib/chama";
import { FREQUENCIES, formatDue, perRound } from "@/lib/schedule";
import type { ChamaPreview } from "@/lib/chamas";
import { useMe } from "@/lib/auth/use-me";
import { cn } from "@/lib/utils";

const STEPS = ["PayPal connected", "Join a chama", "Joining fee", "Auto-deductions"] as const;

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
  // Arriving from a share link (/join/CODE) pre-fills the code.
  const sharedCode = useSearchParams().get("code") ?? "";
  // Step 0 ("PayPal connected") is done at sign-in: members log in with PayPal.
  const [step, setStep] = useState(1);
  const me = useMe();
  // A shared code is looked up on arrival, so start in the loading state.
  const [busy, setBusy] = useState(Boolean(sharedCode));
  const [code, setCode] = useState(sharedCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [chama, setChama] = useState<ChamaPreview | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [receipt, setReceipt] = useState<CaptureResult | null>(null);
  const feePaid = receipt !== null;
  const [autoDebit, setAutoDebit] = useState(true);
  const [reminders, setReminders] = useState(true);

  async function fetchPreview(value: string): Promise<{ chama: ChamaPreview | null; error: string | null }> {
    try {
      const res = await fetch(`/api/chamas/lookup?code=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (!res.ok) return { chama: null, error: data.error ?? "Something went wrong. Please try again." };
      return { chama: data.chama, error: null };
    } catch {
      return { chama: null, error: "Couldn't reach Unitus. Check your connection and try again." };
    }
  }

  async function lookup(value: string) {
    setBusy(true);
    setCodeError(null);
    const result = await fetchPreview(value);
    setChama(result.chama);
    setCodeError(result.error);
    setBusy(false);
  }

  // Look up a shared code straight away.
  useEffect(() => {
    if (!sharedCode) return;
    let cancelled = false;
    fetchPreview(sharedCode).then((result) => {
      if (cancelled) return;
      setChama(result.chama);
      setCodeError(result.error);
      setBusy(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sharedCode]);

  async function join() {
    if (!chama) return;
    if (chama.you?.role === "member") {
      setStep(chama.you.joiningFeePaid ? 3 : 2);
      return;
    }
    setBusy(true);
    setCodeError(null);
    try {
      const res = await fetch("/api/chamas/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: chama.inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't join. Please try again.");
      setChama({ ...chama, memberCount: chama.memberCount + 1, you: { role: "member", joiningFeePaid: false, isCreator: chama.you?.role === "admin" } });
      setStep(2);
    } catch (e) {
      setCodeError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const per = chama ? perRound(chama.frequency) : "round";
  const isAdmin = chama?.you?.role === "admin";
  // Chamas take new members while they run, until they're full or closed.
  const isFull = chama ? !chama.you && (chama.status === "closed" || chama.memberCount >= chama.memberLimit) : false;


  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
      <Stepper current={step} />

      {step === 1 && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Join your chama</CardTitle>
            <CardDescription className="text-base">
              {me?.name ? `Welcome, ${me.name.split(" ")[0]}. ` : ""}Enter the invite code your group admin shared with you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void lookup(code);
              }}
              className="flex gap-2"
            >
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="K7QM-3XPA"
                aria-label="Invite code"
                aria-invalid={!!codeError}
                className="h-11 font-mono uppercase"
              />
              <Button type="submit" size="lg" variant="outline" className="h-11 px-4" disabled={busy || !code.trim()}>
                {busy ? <Loader2Icon className="animate-spin" /> : "Find"}
              </Button>
            </form>
            {codeError && <FieldError>{codeError}</FieldError>}

            {chama && (
              <div className="rounded-2xl border bg-secondary/40 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <UsersIcon className="size-5" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold">{chama.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {chama.memberCount} of {chama.memberLimit} members · {FREQUENCIES[chama.frequency].label.toLowerCase()} ·{" "}
                      {chama.status === "active" ? "running now" : `first round ${formatDue(chama.startsAt, chama.frequency)}`}
                      {chama.createdBy && ` · started by ${chama.createdBy}`}
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                {chama.description && <p className="mb-3 text-sm text-muted-foreground">{chama.description}</p>}
                <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
                  <LockIcon className="size-3.5 text-primary" /> The chama&apos;s rules (locked)
                </p>
                <Row label="Joining fee (locked in your savings)" value={money(chama.rules.joiningFee)} />
                <Row label="Merry-go-round contribution" value={`${money(chama.rules.monthlyContribution)} / ${per}`} />
                <Row label="Payout when it's your turn" value={`up to ${money(chama.rules.monthlyContribution * (chama.memberLimit - 1))}`} />
                <Row label="Savings" value={`${money(chama.rules.monthlySavings)} / ${per}`} />
                <Row label="Savings shared out" value={chama.rules.shareOut === "year-end" ? "At year end" : "Mid-year"} />
                <Row label="Loans" value={`Up to ${chama.rules.loanMultiplier}× savings at ${chama.rules.loanInterestRate}% flat`} />
                <Row label="Auto-deduction" value={`${FREQUENCIES[chama.frequency].label}, from your saved PayPal`} />
                {chama.status === "active" && (
                  <p className="mt-3 rounded-xl bg-background/60 p-3 text-xs text-muted-foreground">
                    This chama is already running. You&apos;ll pay into rounds from when you join. Members who received before you joined
                    don&apos;t pay into your round, and you don&apos;t pay into theirs, until the next cycle.
                  </p>
                )}
              </div>
            )}
            {chama?.you?.role === "member" && (
              <Alert>
                <BadgeCheckIcon />
                <AlertDescription>
                  You&apos;re already a member of this chama.
                  {chama.you.joiningFeePaid ? " Your joining fee is paid." : " Next, pay your joining fee."}
                </AlertDescription>
              </Alert>
            )}
            {isAdmin && (
              <Alert>
                <LockIcon />
                <AlertTitle>You started this chama</AlertTitle>
                <AlertDescription>
                  You can also join it as a member: pay the joining fee, pay into each round and take your turn at the pot, like
                  everyone else. Being the admin never lets you move the chama&apos;s money.
                </AlertDescription>
              </Alert>
            )}
            {isFull && <FieldError>This chama is full and no longer accepting members.</FieldError>}
          </CardContent>
          <CardFooter className="justify-between">
            <Link href="/groups/new" className="text-sm font-medium text-primary hover:underline">
              Start a new chama instead
            </Link>
            <Button size="lg" disabled={!chama || isFull || busy} onClick={join}>
              {busy && chama ? <Loader2Icon className="animate-spin" /> : null}
              {chama?.you?.role === "member" ? "Continue" : "Join this chama"} <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && chama && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Pay your joining fee</CardTitle>
            <CardDescription className="text-base">
              A one-time {money(chama.rules.joiningFee)} joining fee to {chama.name} confirms your PayPal account works and starts your
              savings.
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

            <div className="rounded-2xl border px-5 py-3">
              <Row label="Joining fee (goes to your savings)" value={money(chama.charges.joiningFee.principal)} />
              <Row label="PayPal processing fee" value={money(chama.charges.joiningFee.fee)} />
              <Separator className="my-1" />
              <Row label="You pay" value={money(chama.charges.joiningFee.total)} strong />
            </div>

            {feePaid ? (
              <Alert className="border-primary/30 bg-secondary/60">
                <BadgeCheckIcon className="text-primary" />
                <AlertTitle>{money(Number(receipt.amount ?? chama.rules.joiningFee))} received. Your PayPal is verified.</AlertTitle>
                <AlertDescription>
                  It&apos;s now in your locked savings.
                  {receipt.payerEmail && ` Paid from ${receipt.payerEmail}.`}
                  {receipt.captureId && <span className="block font-mono text-xs">PayPal ref {receipt.captureId}</span>}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Field orientation="horizontal">
                  <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
                  <FieldContent>
                    <FieldLabel htmlFor="agree">I understand the joining fee is locked until I leave the chama</FieldLabel>
                    <FieldDescription>
                      Leaving is only possible once the current cycle ends (everyone has received once). Any loan balance is
                      deducted from what you withdraw.
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <PayPalPayButton purpose={{ purpose: "joining-fee", chamaId: chama.id }} savePayment disabled={!agreed} onCaptured={setReceipt} />
                <p className="text-xs text-muted-foreground">
                  Paying also saves your PayPal so your share of each round can be collected automatically.
                </p>
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

      {step === 3 && chama && (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Set up automatic deductions</CardTitle>
            <CardDescription className="text-base">
              Every round ({FREQUENCIES[chama.frequency].label.toLowerCase()}), Unitus collects your share from PayPal, so you never
              miss a draw. When it&apos;s your turn, the pot is paid straight to your PayPal.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="rounded-2xl border p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarClockIcon className="size-4 text-primary" /> Each round
              </div>
              <Row label="Merry-go-round contribution" value={money(chama.rules.monthlyContribution)} />
              <Row label="Savings" value={money(chama.rules.monthlySavings)} />
              <Row label="PayPal processing fee" value={money(chama.charges.monthly.fee)} />
              <Row label="Loan repayment" value="Only while you have a loan" />
              <Separator className="my-2" />
              <Row label="Total from PayPal" value={money(chama.charges.monthly.total)} strong />
              <Row label="In the round you're drawn" value="Same, and you receive the whole pot" />
            </div>

            {receipt?.paypalSaved || (!receipt && chama.you?.role === "member" && chama.you.joiningFeePaid) ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <BadgeCheckIcon className="size-4 text-primary" /> Your PayPal was saved when you paid the joining fee.
              </p>
            ) : (
              <Alert>
                <AlertDescription>
                  PayPal is still finishing saving your account for automatic payments; this usually takes a few minutes. Your dashboard
                  shows when it&apos;s ready. Until then you won&apos;t be charged or drawn in rounds.
                </AlertDescription>
              </Alert>
            )}

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
              disabled={!autoDebit}
              // TODO(backend): save the auto-deduction and reminder preferences.
              onClick={() => router.push("/dashboard")}
            >
              Go to my dashboard
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
