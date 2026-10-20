"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRightIcon, CheckCircle2Icon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/chama";

/** Withdraw from the Unitus wallet to the member's PayPal. */
export function WithdrawForm({ balance, min }: { balance: number; min: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const value = Number(amount);
  const invalid =
    amount === ""
      ? null
      : !/^\d+(\.\d{1,2})?$/.test(amount)
        ? "Enter an amount like 250 or 250.50."
        : value < min
          ? `The smallest withdrawal is ${money(min)}.`
          : value > balance
            ? `You have ${money(balance)} in your wallet.`
            : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || amount === "" || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The withdrawal didn't go through.");
      setDone(
        data.status === "failed"
          ? "PayPal couldn't accept the withdrawal, so the money is back in your wallet."
          : `${money(data.amount)} is on its way to your PayPal. It usually arrives within a few minutes.`,
      );
      setAmount("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (balance < min) {
    return <p className="text-sm text-muted-foreground">When you win a round, the pot lands here and you can withdraw it to your PayPal.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field data-invalid={invalid ? true : undefined}>
        <FieldLabel htmlFor="withdraw-amount">Amount to withdraw (USD)</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="withdraw-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            className="h-10"
            value={amount}
            onChange={(e) => setAmount(e.target.value.trim())}
            aria-invalid={invalid ? true : undefined}
          />
          <Button type="button" variant="outline" className="h-10" onClick={() => setAmount(balance.toFixed(2))}>
            All
          </Button>
        </div>
        {invalid ? (
          <FieldError>{invalid}</FieldError>
        ) : (
          <FieldDescription>
            Sent to the PayPal account you pay your chamas with. Unitus pays PayPal&apos;s fee.
          </FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" disabled={busy || !!invalid || amount === ""}>
        <ArrowUpRightIcon data-icon="inline-start" />
        {busy ? "Sending…" : amount && !invalid ? `Withdraw ${money(value)} to PayPal` : "Withdraw to PayPal"}
      </Button>
      {done && (
        <Alert>
          <CheckCircle2Icon />
          <AlertDescription>{done}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
