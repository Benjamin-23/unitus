import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ChamaStudioLoader } from "@/components/analytics/chama-studio-loader";
import { getSession } from "@/lib/auth/session";
import { getChamaDashboard, listDashboardChamas } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics · Unitus" };

async function Analytics({ searchParams }: { searchParams: PageProps<"/dashboard/analytics">["searchParams"] }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/analytics");
  const params = await searchParams;
  const chamas = await listDashboardChamas(session.memberId);
  if (chamas.length === 0) {
    return (
      <p className="rounded-3xl border border-dashed py-16 text-center text-muted-foreground">
        Analytics appear once you&apos;re in a chama.{" "}
        <Link href="/onboarding" className="text-primary underline">
          Join one
        </Link>
        .
      </p>
    );
  }
  const selected = chamas.find((c) => c.id === params.chama) ?? chamas[0];
  const d = await getChamaDashboard(selected.id, session.memberId);
  if (!d) redirect("/dashboard/analytics");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{d.chama.name}</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Chama analytics</h1>
        </div>
        {chamas.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Choose a chama">
            {chamas.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/analytics?chama=${c.id}`}
                className={cn(buttonVariants({ variant: c.id === d.chama.id ? "default" : "outline" }), "h-9 rounded-full")}
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <ChamaStudioLoader
        data={{
          monthly: d.monthly,
          members: d.members.map((m) => ({
            name: m.name,
            country: m.country,
            // "Name · Country" keeps per-member charts readable when names repeat across countries.
            memberCountry: `${m.name} · ${m.country}`,
            feePaid: m.feePaid ? "Paid" : "Not paid",
            months: m.rounds,
            contributed: m.contributed,
            savings: m.savings,
          })),
        }}
      />
    </>
  );
}

export default function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <Suspense fallback={<div className="h-[1320px] animate-pulse rounded-3xl border bg-card" />}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
