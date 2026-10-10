import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { ExternalLinkIcon, LogOutIcon, ShieldAlertIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CreateChamaFlow } from "@/components/create/create-chama-flow";
import { getSession } from "@/lib/auth/session";
import { canCreateChama } from "@/lib/chamas";

export const metadata: Metadata = { title: "Start a chama · Unitus" };

// Rendered per request so "next month" is based on today, not the build date.
async function Flow() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login?next=/groups/new");
  if (!(await canCreateChama(session.memberId))) return <CreateBlocked />;

  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  const nextMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return <CreateChamaFlow defaultStartMonth={nextMonth} />;
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

/** Admin and member accounts are separate (migration 0004). */
function CreateBlocked() {
  return (
    <Card className="mx-auto w-full max-w-xl rounded-3xl">
      <CardHeader>
        <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-accent/30 text-accent-foreground dark:text-accent">
          <ShieldAlertIcon className="size-6" />
        </div>
        <CardTitle className="font-heading text-2xl">Use a separate PayPal account to start a chama</CardTitle>
        <CardDescription className="text-base">
          This PayPal account already takes part in a chama as a member. To keep running a chama separate from paying into one,
          a chama is always created from its own PayPal account, one that isn&apos;t a member anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p className="font-semibold">To start a chama:</p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-muted-foreground">
          <li>Log out of this account.</li>
          <li>
            Log in with a different personal PayPal account, or{" "}
            <a href="https://www.paypal.com/signup" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
              sign up for a new one at PayPal <ExternalLinkIcon className="size-3" />
            </a>
            .
          </li>
          <li>Come back to Start a chama. That account becomes the chama&apos;s admin.</li>
        </ol>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <a href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Back to my dashboard
        </a>
        <form action="/api/auth/logout" method="post">
          <Button type="submit" size="lg">
            <LogOutIcon data-icon="inline-start" /> Log out to switch account
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
