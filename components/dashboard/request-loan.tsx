"use client";

import { useState } from "react";
import { BadgeCheckIcon, HandCoinsIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { loanInstalment, loanLimit, money } from "@/lib/chama";
import { DEMO_ACCOUNT, DEMO_GROUP } from "@/lib/mock-data";

export function RequestLoan() {
  const { available } = loanLimit(DEMO_GROUP, DEMO_ACCOUNT);
  const [amount, setAmount] = useState(Math.min(500, available));
  const [months, setMonths] = useState(6);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const valid = amount > 0 && amount <= available;
  const loan = { principal: amount, interestRate: DEMO_GROUP.loanInterestRate, months, instalmentsPaid: 0, disbursedOn: "" };
  const instalment = valid ? loanInstalment(loan) : 0;

  return (
    <Dialog onOpenChange={(open) => !open && setState("idle")}>
      <DialogTrigger render={<Button size="lg" className="h-10 px-4" />}>
        <HandCoinsIcon data-icon="inline-start" /> Request a loan
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Request a loan</DialogTitle>
          <DialogDescription>
            Borrow up to {money(available)} at the group&apos;s {DEMO_GROUP.loanInterestRate}% flat rate. Repayments are added to your
            monthly auto-deduction.
          </DialogDescription>
        </DialogHeader>

        {state === "sent" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <BadgeCheckIcon className="size-10 text-primary" />
            <p className="font-heading text-lg font-semibold">Request sent to your group admins</p>
            <p className="text-sm text-muted-foreground">
              Once approved, {money(amount)} is sent to your PayPal and {money(instalment)} is added to each monthly deduction.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="loan-amount">Amount (USD)</FieldLabel>
              <Input
                id="loan-amount"
                type="number"
                inputMode="decimal"
                min={1}
                max={available}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-invalid={!valid}
                className="h-11"
              />
              <FieldDescription>{valid ? `Available: ${money(available)}` : `Enter an amount between $1 and ${money(available)}.`}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="loan-months">Repay over</FieldLabel>
              <div id="loan-months" className="grid grid-cols-4 gap-2">
                {[3, 6, 9, 12].map((m) => (
                  <Button key={m} type="button" variant={months === m ? "default" : "outline"} onClick={() => setMonths(m)} className="h-10">
                    {m} mo
                  </Button>
                ))}
              </div>
            </Field>
            <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Interest ({DEMO_GROUP.loanInterestRate}% flat)</span>
                <span>{money(valid ? amount * (DEMO_GROUP.loanInterestRate / 100) : 0)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between py-1 font-semibold">
                <span>Added to each auto-deduction</span>
                <span className="font-heading text-lg">{money(instalment)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{state === "sent" ? "Close" : "Cancel"}</DialogClose>
          {state !== "sent" && (
            <Button
              disabled={!valid || state === "sending"}
              onClick={async () => {
                setState("sending");
                // TODO(backend): create the loan request for admin approval.
                await new Promise((r) => setTimeout(r, 900));
                setState("sent");
              }}
            >
              {state === "sending" && <Loader2Icon className="animate-spin" />}
              Send request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
