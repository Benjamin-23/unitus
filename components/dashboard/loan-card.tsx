"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, CircleIcon, HandCoinsIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { money } from "@/lib/chama";
import { cn } from "@/lib/utils";

export type LoanCardProps = {
  chamaId: string;
  chamaName: string;
  interestRate: number;
  minSavingRounds: number;
  /** Share of savings they can borrow now, and how much each good loan adds. */
  limitPercent: number;
  stepPercent: number;
  instalmentChoices: readonly number[];
  savingRounds: number;
  skippedRounds: number;
  goodLoans: number;
  loanElsewhere: boolean;
  savings: number;
  limit: number;
  available: number;
  loan: { principal: number; total: number; repaid: number; balance: number; nextInstalment: number; instalments: number } | null;
};

const cents = (n: number) => Math.round(n * 100) / 100;

/** Borrowing from the chama: locked until every check passes. */
export function LoanCard(p: LoanCardProps) {
  const roundsLeft = Math.max(0, p.minSavingRounds - p.savingRounds);
  const checks = [
    {
      ok: roundsLeft === 0,
      label: `Saved in ${p.minSavingRounds} rounds`,
      detail: roundsLeft === 0 ? `${p.savingRounds} rounds saved` : `${p.savingRounds} of ${p.minSavingRounds}, ${roundsLeft} to go`,
    },
    {
      ok: p.skippedRounds === 0,
      label: "No missed round payments",
      detail: p.skippedRounds === 0 ? "Every round paid" : `${p.skippedRounds} missed`,
    },
    {
      ok: !p.loanElsewhere,
      label: "No other loan open",
      detail: p.loanElsewhere ? "Repay your loan in your other chama first" : "None open",
    },
  ];
  const unlocked = checks.every((c) => c.ok);

  return (
    <Card className="gap-3 rounded-3xl">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <HandCoinsIcon className="size-5" />
        </div>
        <CardDescription className="text-sm font-medium">{p.loan ? "Your loan" : "Borrow from the chama"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {p.loan ? (
          <>
            <p className="font-heading text-3xl font-semibold tracking-tight">{money(p.loan.balance)} left</p>
            <Progress value={(p.loan.repaid / p.loan.total) * 100} className="[&_[data-slot=progress-track]]:h-2" />
            <p className="text-sm text-muted-foreground">
              {money(p.loan.repaid)} of {money(p.loan.total)} repaid · borrowed {money(p.loan.principal)}
            </p>
            <p className="text-sm text-muted-foreground">
              {money(p.loan.nextInstalment)} is added to your next round payment, until it&apos;s repaid. Repay without missing a round and
              your next limit grows by {p.stepPercent}%.
            </p>
          </>
        ) : (
          <>
            <p className="font-heading text-3xl font-semibold tracking-tight">{money(unlocked ? p.available : p.limit)}</p>
            <p className="text-sm text-muted-foreground">
              {p.limitPercent}% of your {money(p.savings)} savings at {p.interestRate}% interest
              {unlocked && p.available < p.limit ? " (capped by what the chama has left to lend)" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.goodLoans === 0
                ? `Your first loan is ${p.limitPercent}%. Each loan repaid without missing a round adds ${p.stepPercent}%.`
                : `${p.goodLoans} loan${p.goodLoans === 1 ? "" : "s"} repaid on time · +${p.stepPercent}% with each one`}
            </p>
            <ul className="flex flex-col gap-1.5 rounded-2xl border p-3 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2">
                  {c.ok ? (
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                  ) : (
                    <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>
                    <span className={cn("font-medium", !c.ok && "text-muted-foreground")}>{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <BorrowDialog {...p} disabled={!unlocked || p.available < 1} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BorrowDialog(p: LoanCardProps & { disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [instalments, setInstalments] = useState(p.instalmentChoices.includes(3) ? 3 : p.instalmentChoices[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const value = Number(amount);
  const invalid =
    amount === ""
      ? null
      : !/^\d+(\.\d{1,2})?$/.test(amount)
        ? "Enter an amount like 250 or 250.50."
        : value < 1
          ? "The smallest loan is $1."
          : value > p.available
            ? `You can borrow up to ${money(p.available)}.`
            : null;
  const interest = cents((value * p.interestRate) / 100);
  const total = cents(value + interest);
  const perRound = Math.ceil((total * 100) / instalments) / 100;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || amount === "" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/chamas/${p.chamaId}/loan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, instalments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The loan didn't go through.");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const reset = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setAmount("");
      setError(null);
      setDone(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger render={<Button className="mt-1 w-fit" disabled={p.disabled} />}>
        <HandCoinsIcon data-icon="inline-start" />
        Borrow
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Borrow from {p.chamaName}</DialogTitle>
          <DialogDescription>
            The loan goes to your Unitus wallet, and you can withdraw it to your PayPal from there. You repay it with your round payments.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <>
            <Alert>
              <CheckCircle2Icon />
              <AlertDescription>
                {money(value)} is in your wallet. {money(perRound)} will be added to each of your next {instalments} round payment
                {instalments === 1 ? "" : "s"}.
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
              <Link href="/dashboard/my-wallet" className={cn(buttonVariants())}>
                Open my wallet
              </Link>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field data-invalid={invalid ? true : undefined}>
              <FieldLabel htmlFor="loan-amount">Amount (USD)</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="loan-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  className="h-10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.trim())}
                  aria-invalid={invalid ? true : undefined}
                />
                <Button type="button" variant="outline" className="h-10" onClick={() => setAmount(p.available.toFixed(2))}>
                  Max
                </Button>
              </div>
              {invalid ? <FieldError>{invalid}</FieldError> : <FieldDescription>Up to {money(p.available)}.</FieldDescription>}
            </Field>

            <Field>
              <FieldLabel>Repay over</FieldLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Repay over">
                {p.instalmentChoices.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={instalments === n}
                    variant={instalments === n ? "default" : "outline"}
                    className="h-9"
                    onClick={() => setInstalments(n)}
                  >
                    {n} round{n === 1 ? "" : "s"}
                  </Button>
                ))}
              </div>
            </Field>

            {amount !== "" && !invalid && (
              <div className="rounded-2xl border p-4 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">You receive</span>
                  <span>{money(value)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Interest ({p.interestRate}%, to the chama&apos;s savings)</span>
                  <span>{money(interest)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between py-1 font-semibold">
                  <span>You repay</span>
                  <span>{money(total)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  About {money(perRound)} added to each of your next {instalments} round payment{instalments === 1 ? "" : "s"}, plus PayPal&apos;s
                  fee on it.
                </p>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={busy || !!invalid || amount === ""}>
                {busy ? "Borrowing…" : amount && !invalid ? `Borrow ${money(value)}` : "Borrow"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
