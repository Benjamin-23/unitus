"use client";

import { useMemo, useState } from "react";
import { BadgeCheckIcon, CheckIcon, EyeOffIcon, HeartIcon, ShieldCheckIcon, TrophyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { PayPalPayButton, type CaptureResult } from "@/components/paypal/paypal-pay-button";
import { money } from "@/lib/chama";
import { affordability, discountPercent, rankForPayout, type Affordability, type Offer, type OfferCategory } from "@/lib/marketplace";
import { MERCHANTS, OFFERS } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";
import { CategoryIcon, CategoryTile } from "./category-icon";

const CATEGORIES: OfferCategory[] = ["Electronics", "Vehicles", "Home", "Phones", "Farming", "Education"];

function FitBadge({ fit }: { fit: Affordability }) {
  if (fit.kind === "covered")
    return (
      <Badge className="h-auto border-0 bg-secondary px-2 py-1 text-primary whitespace-normal">
        <CheckIcon /> Covered by your payout · {money(fit.leftOver)} left over
      </Badge>
    );
  if (fit.kind === "deposit")
    return (
      <Badge className="h-auto border-0 bg-accent/30 px-2 py-1 text-accent-foreground whitespace-normal dark:text-accent">
        Payout covers the {money(fit.deposit)} deposit, then {money(fit.monthly)}/mo × {fit.months}
      </Badge>
    );
  return (
    <Badge variant="outline" className="h-auto px-2 py-1 text-muted-foreground whitespace-normal">
      {money(fit.shortBy)} more than your payout
    </Badge>
  );
}

function BuyDialog({ offer, fit }: { offer: Offer; fit: Affordability }) {
  const [receipt, setReceipt] = useState<CaptureResult | null>(null);
  const merchant = MERCHANTS.find((m) => m.id === offer.merchantId)!;
  // Items with instalments take the deposit now, even when it's more than the payout (the member tops up).
  const plan = fit.kind !== "covered" ? offer.instalments : undefined;
  const dueNow = plan ? plan.deposit : offer.price;
  return (
    <Dialog onOpenChange={(open) => !open && setReceipt(null)}>
      <DialogTrigger render={<Button className="flex-1" variant={fit.kind === "out-of-reach" ? "outline" : "default"} />}>
        {plan ? "Pay deposit" : "Buy now"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{offer.title}</DialogTitle>
          <DialogDescription>
            Sold and delivered by {merchant.name}. You pay with your own PayPal; money never comes out of the chama account.
          </DialogDescription>
        </DialogHeader>
        {receipt ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <BadgeCheckIcon className="size-10 text-primary" />
            <p className="font-heading text-lg font-semibold">Paid {money(Number(receipt.amount ?? dueNow))}</p>
            <p className="text-sm text-muted-foreground">{merchant.name} will contact you to arrange delivery.</p>
            {receipt.captureId && <p className="font-mono text-xs text-muted-foreground">PayPal ref {receipt.captureId}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Member price</span>
                <span>
                  <span className="mr-2 text-muted-foreground line-through">{money(offer.listPrice)}</span>
                  {money(offer.price)}
                </span>
              </div>
              {plan && (
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Then, paid to {merchant.name}</span>
                  <span>
                    {money(plan.monthly)} × {plan.months} months
                  </span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between py-1 font-semibold">
                <span>Due now</span>
                <span className="font-heading text-lg">{money(dueNow)}</span>
              </div>
            </div>
            <PayPalPayButton purpose={{ purpose: "offer", offerId: offer.id }} onCaptured={setReceipt} />
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{receipt ? "Close" : "Cancel"}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferCard({ offer, payout, saved, onSave }: { offer: Offer; payout: number; saved: boolean; onSave: () => void }) {
  const merchant = MERCHANTS.find((m) => m.id === offer.merchantId)!;
  const fit = affordability(offer, payout);
  return (
    <Card className={cn("gap-0 overflow-hidden rounded-3xl py-0", fit.kind === "out-of-reach" && "opacity-75")}>
      <div className="relative p-3">
        <CategoryTile category={offer.category} className="aspect-[16/9] w-full" />
        <Badge className="absolute top-5 left-5 border-0 bg-clay text-white">−{discountPercent(offer)}%</Badge>
        <Button
          variant="secondary"
          size="icon"
          onClick={onSave}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save for my payout"}
          className="absolute top-5 right-5 rounded-full"
        >
          <HeartIcon className={cn(saved && "fill-clay text-clay")} />
        </Button>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-4">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {merchant.name}
          {merchant.verified && <BadgeCheckIcon className="size-3.5 text-primary" aria-label="Verified partner" />}
        </p>
        <h3 className="font-heading text-lg leading-snug font-semibold">{offer.title}</h3>
        <p className="text-sm text-muted-foreground">{offer.description}</p>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-heading text-2xl font-semibold">{money(offer.price)}</span>
          <span className="text-sm text-muted-foreground line-through">{money(offer.listPrice)}</span>
        </div>
        <FitBadge fit={fit} />
      </CardContent>
      <CardFooter className="gap-2 px-5 pb-5">
        <BuyDialog offer={offer} fit={fit} />
      </CardFooter>
    </Card>
  );
}

export function OffersBrowser({ payout, hasWon }: { payout: number; hasWon: boolean }) {
  const [optedIn, setOptedIn] = useState(true);
  const [category, setCategory] = useState<OfferCategory | "All">("All");
  const [onlyCovered, setOnlyCovered] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const offers = useMemo(() => {
    let list = OFFERS.filter((o) => o.status === "Live");
    if (category !== "All") list = list.filter((o) => o.category === category);
    if (onlyCovered) list = list.filter((o) => affordability(o, payout).kind !== "out-of-reach");
    return rankForPayout(list, payout);
  }, [category, onlyCovered, payout]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-3xl bg-band text-band-foreground">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <TrophyIcon className="size-6" />
            </div>
            <div>
              {payout > 0 ? (
                <>
                  <p className="text-sm text-band-foreground/75">{hasWon ? "Your payout this cycle" : "When you win the merry-go-round"}</p>
                  <p className="font-heading text-3xl font-semibold">{money(payout)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-band-foreground/75">Not in a chama yet</p>
                  <p className="font-heading text-xl font-semibold">Join one to see what your payout covers</p>
                </>
              )}
            </div>
          </div>
          <p className="max-w-md text-sm text-band-foreground/80">
            Offers below are ranked by how well they fit your payout. Partner businesses never see your name, contacts or balances.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <Button key={c} variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)} className="h-9 rounded-full px-4" aria-pressed={category === c}>
              {c !== "All" && <CategoryIcon category={c} />}
              {c}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2">
            <Switch checked={onlyCovered} onCheckedChange={setOnlyCovered} disabled={!optedIn} />
            Only what my payout covers
          </label>
          <label className="flex items-center gap-2">
            <Switch checked={optedIn} onCheckedChange={setOptedIn} />
            Show partner offers
          </label>
        </div>
      </div>

      {!optedIn ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed py-16 text-center">
          <EyeOffIcon className="size-8 text-muted-foreground" />
          <p className="font-heading text-lg font-semibold">Partner offers are hidden</p>
          <p className="max-w-sm text-sm text-muted-foreground">Turn them back on any time. Your chama works exactly the same either way.</p>
        </div>
      ) : offers.length === 0 ? (
        <p className="rounded-3xl border border-dashed py-16 text-center text-muted-foreground">No offers match these filters yet.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              payout={payout}
              saved={saved.has(o.id)}
              onSave={() =>
                setSaved((s) => {
                  const next = new Set(s);
                  if (next.has(o.id)) next.delete(o.id);
                  else next.add(o.id);
                  return next;
                })
              }
            />
          ))}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-4 text-primary" />
        Offers come from partner businesses who sell and deliver the products. Unitus earns a small referral fee from the business,
        never from you.
      </p>
    </div>
  );
}
