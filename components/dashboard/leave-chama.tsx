"use client";

import { DoorOpenIcon, LockIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { exitStatus, money } from "@/lib/chama";
import { DEMO_ACCOUNT, DEMO_GROUP } from "@/lib/mock-data";

export function LeaveChama() {
  const status = exitStatus(DEMO_GROUP, DEMO_ACCOUNT);
  const { settlement } = status;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" className="h-10" />}>
        <DoorOpenIcon data-icon="inline-start" />
        Leave chama
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Leaving {DEMO_GROUP.name}</DialogTitle>
          <DialogDescription>
            {status.allowed
              ? "The cycle is complete, so you can leave and withdraw your savings."
              : `You can leave once the merry-go-round has gone all the way round. ${status.drawsRemaining} draws remain; the cycle ends in ${status.cycleEnds}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border p-4 text-sm">
          <p className="mb-2 font-semibold">If you left at the end of the cycle</p>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Your savings</span>
            <span>{money(settlement.savings)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <LockIcon className="size-3.5" /> Joining fee released
            </span>
            <span>{money(settlement.joiningFee)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Loan balance deducted</span>
            <span className="text-clay">−{money(settlement.loanDeducted)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between py-1 font-semibold">
            <span>Paid to your PayPal</span>
            <span className="font-heading text-lg">{money(settlement.payout)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Figures are as of today. Loan instalments paid before the cycle ends reduce the deduction.
          </p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Stay in the chama</DialogClose>
          <Button variant="destructive" disabled={!status.allowed}>
            {status.allowed ? "Leave and withdraw" : `Available after ${status.cycleEnds}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
