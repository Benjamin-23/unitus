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
import { money } from "@/lib/chama";

/** What a member would get back on leaving, from their real ledger. */
export function LeaveChama({
  chamaName,
  savings,
  joiningFee,
  drawsRemaining,
  cycleEnd,
}: {
  chamaName: string;
  savings: number;
  joiningFee: number;
  drawsRemaining: number;
  cycleEnd: string;
}) {
  const allowed = drawsRemaining === 0;
  // TODO(loans): deduct any outstanding loan balance once loans are stored.
  const payout = savings + joiningFee;

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="lg" className="h-10" />}>
        <DoorOpenIcon data-icon="inline-start" />
        Leave chama
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Leaving {chamaName}</DialogTitle>
          <DialogDescription>
            {allowed
              ? "The cycle is complete, so you can leave and withdraw your savings."
              : `You can leave once the merry-go-round has gone all the way round. ${drawsRemaining} draws remain; the cycle ends in ${cycleEnd}.`}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border p-4 text-sm">
          <p className="mb-2 font-semibold">If you left at the end of the cycle</p>
          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">Your savings so far</span>
            <span>{money(savings)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <LockIcon className="size-3.5" /> Joining fee released
            </span>
            <span>{money(joiningFee)}</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between py-1 font-semibold">
            <span>Paid to your PayPal</span>
            <span className="font-heading text-lg">{money(payout)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Figures are as of today and grow with each round.</p>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Stay in the chama</DialogClose>
          <Button variant="destructive" disabled={!allowed}>
            {allowed ? "Leave and withdraw" : `Available after ${cycleEnd}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
