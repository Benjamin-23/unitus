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
import type { ChamaRow } from "@/lib/chamas";
import { cn } from "@/lib/utils";

function DeleteChama({ snapshot, name }: { snapshot: GroupSnapshot; name: string }) {
  const { items, canDelete } = deletionChecklist(snapshot);
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" />}>
        <Trash2Icon data-icon="inline-start" /> Delete chama
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Delete {name}?</DialogTitle>
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

export function ChamaRules({
  chama,
  cycle,
  snapshot,
  accountBalance,
  canDelete,
}: {
  chama: ChamaRow;
  cycle: { start: string; end: string };
  snapshot: GroupSnapshot;
  accountBalance: number;
  /** Only the chama's admin can ask to delete it. */
  canDelete: boolean;
}) {
  const contribution = Number(chama.monthly_contribution);
  const month = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  };
  const rules: [string, string][] = [
    ["Merry-go-round", `${money(contribution)} / month → ${money(contribution * chama.member_limit)} payout`],
    ["Savings", `${money(Number(chama.monthly_savings))} / month, shared out ${chama.share_out === "year-end" ? "at year end" : "mid-year"}`],
    ["Joining fee", `${money(Number(chama.joining_fee))}, locked until a member leaves`],
    ["Loans", `Up to ${chama.loan_multiplier}× savings at ${Number(chama.loan_interest_rate)}% flat`],
    ["Auto-deduction", `${ordinal(chama.deduction_day)} of each month`],
    ["Cycle", `${chama.member_limit} members · ${month(cycle.start)} – ${month(cycle.end)}`],
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
          <CardDescription>Chama balance (held in the Unitus PayPal pool)</CardDescription>
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
          {canDelete && (
            <div className="flex justify-end border-t pt-3">
              <DeleteChama snapshot={snapshot} name={chama.name} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
