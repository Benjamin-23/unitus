import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OffersBrowser } from "@/components/marketplace/offers-browser";
import { getSession } from "@/lib/auth/session";
import { memberPayout } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Offers · Unitus" };

async function Offers() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/offers");
  // TODO(payouts): set hasWon once draws are recorded.
  return <OffersBrowser payout={await memberPayout(session.memberId)} hasWon={false} />;
}

export default function OffersPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">Partner offers · sample catalogue until partners join</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Make your payout go further</h1>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-muted" />}>
        <Offers />
      </Suspense>
    </main>
  );
}
