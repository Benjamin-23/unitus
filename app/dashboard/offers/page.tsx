import type { Metadata } from "next";
import { OffersBrowser } from "@/components/marketplace/offers-browser";
import { DEMO_ACCOUNT, DEMO_GROUP } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Offers · Unitus" };

export default function OffersPage() {
  const payout = DEMO_GROUP.monthlyContribution * DEMO_GROUP.memberCount;
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">Partner offers</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Make your payout go further</h1>
      </div>
      <OffersBrowser payout={payout} hasWon={DEMO_ACCOUNT.hasReceivedPayout} />
    </main>
  );
}
