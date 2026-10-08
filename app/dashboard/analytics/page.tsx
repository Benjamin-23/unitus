import type { Metadata } from "next";
import { ChamaStudioLoader } from "@/components/analytics/chama-studio-loader";
import { DEMO_GROUP } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Analytics · Unitus" };

export default function AnalyticsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-sm text-muted-foreground">{DEMO_GROUP.name}</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Chama analytics</h1>
      </div>
      <ChamaStudioLoader />
    </main>
  );
}
