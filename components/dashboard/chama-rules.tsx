"use client";

import { BanIcon, CheckCircle2Icon, CircleDashedIcon, LockIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AUTOMATIC_PAYOUTS, deletionChecklist, money, ordinal, type GroupSnapshot } from "@/lib/chama";
import { DEMO_GROUP } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function DeleteChama({ snapshot }: { snapshot: GroupSnapshot }) {
  const { items, canDelete } = deletionChecklist(snapshot);
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}>
        <Trash2Icon data-icon="inline-start" /> Delete chama
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Delete {DEMO_GROUP.name}?</DialogTitle>
          <DialogDescription>
            A chama can only be deleted once it&apos;s clean for everyone, so nobody is left owed or owing.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {items.map((i) => (
            <li key={i.label} className="flex items-start gap-3 rounded-xl border p-3 text-sm">
              {i.done ? (
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-clay" />
              )}
              <div>
                <p className="font-medium">{i.label}</p>
                <p className={cn("text-xs", i.done ? "text-muted-foreground" : "text-clay")}>{i.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          <Button variant="destructive" disabled={!canDelete}>
            {canDelete ? "Delete chama" : "Not yet possible"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ChamaRules({ snapshot, accountBalance }: { snapshot: GroupSnapshot; accountBalance: number }) {
  const g = DEMO_GROUP;
  const rules: [string, string][] = [
    ["Merry-go-round", `${money(g.monthlyContribution)} / month → ${money(g.monthlyContribution * g.memberCount)} payout`],
    ["Savings", `${money(g.monthlySavings)} / month, shared out ${g.shareOut === "year-end" ? "at year end" : "mid-year"}`],
    ["Joining fee", `${money(g.joiningFee)}, locked until a member leaves`],
    ["Loans", `Up to ${g.loanMultiplier}× savings at ${g.loanInterestRate}% flat`],
    ["Auto-deduction", `${ordinal(g.deductionDay)} of each month`],
    ["Cycle", `${g.memberCount} members · ${g.cycle.startMonth} – ${g.cycle.endMonth}`],
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="font-heading text-xl">Chama rules</CardTitle>
            <CardDescription>Agreed when the chama was created. Nobody can edit them.</CardDescription>
          </div>
          <Badge variant="secondary" className="h-7 shrink-0 gap-1.5 px-2.5">
            <LockIcon className="size-3.5" /> Locked
          </Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 sm:grid-cols-2">
            {rules.map(([k, v]) => (
              <div key={k} className="flex flex-col border-b py-3 last:border-0 sm:[&:nth-last-child(2)]:border-0">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardDescription>Chama PayPal account</CardDescription>
          <CardTitle className="font-heading text-3xl">{money(accountBalance)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="flex items-start gap-3 rounded-2xl bg-muted p-3">
            <BanIcon className="mt-0.5 size-4 shrink-0 text-clay" />
            <p>
              <span className="font-semibold">Withdrawals are disabled.</span> Money only leaves through automatic payouts:
            </p>
          </div>
          <ul className="flex flex-col gap-1.5 pl-1 text-muted-foreground">
            {AUTOMATIC_PAYOUTS.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-primary">•</span> {p}
              </li>
            ))}
          </ul>
          <div className="flex justify-end border-t pt-3">
            <DeleteChama snapshot={snapshot} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
