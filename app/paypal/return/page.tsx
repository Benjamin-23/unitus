import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/landing/logo";

export const metadata: Metadata = { title: "Back from PayPal · Unitus" };

// PayPal sends buyers here only when it used a full-page redirect instead of a popup.
export default function PayPalReturnPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">You&apos;re back from PayPal</h1>
        <p className="text-muted-foreground">If you finished paying, it will show on your dashboard shortly. If you cancelled, nothing was charged.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
        Go to my dashboard
      </Link>
    </main>
  );
}
