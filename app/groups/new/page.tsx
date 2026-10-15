import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CreateChamaFlow } from "@/components/create/create-chama-flow";
import { getSession } from "@/lib/auth/session";
import { allowTestFrequency } from "@/lib/chamas";

export const metadata: Metadata = { title: "Start a chama · Unitus" };

// Rendered per request so the default start time is based on now, not the build date.
async function Flow() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login?next=/groups/new");

  // Default first round: 10 minutes from now, on a 5-minute mark.
  const start = new Date(Math.ceil((new Date().getTime() + 10 * 60_000) / 300_000) * 300_000);
  return <CreateChamaFlow defaultStartsAt={start.toISOString()} allowTestFrequency={allowTestFrequency()} />;
}

export default function NewGroupPage() {
  return (
    <div className="flex min-h-svh flex-col bg-secondary/30">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 px-4 py-10 sm:py-14">
        <Suspense fallback={<div className="mx-auto h-[640px] max-w-5xl animate-pulse rounded-3xl bg-card" />}>
          <Flow />
        </Suspense>
      </main>
    </div>
  );
}
