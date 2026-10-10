"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2Icon, LockIcon, ShieldCheckIcon, UserRoundCheckIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PayPalMark } from "./paypal-button";

const ERRORS: Record<string, string> = {
  cancelled: "You cancelled the PayPal sign-in. Try again when you're ready.",
  expired: "That sign-in link expired. Please try again.",
  paypal: "We couldn't sign you in with PayPal. Please try again in a moment.",
  profile:
    "That PayPal account didn't share its profile with us. This usually means it's a PayPal Business account. Please log in with your personal PayPal account.",
};

export function PayPalLogin({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const error = ERRORS[params.get("error") ?? ""];
  const next = params.get("next");
  const href = `/api/auth/paypal/login${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  const isSignup = mode === "signup";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{isSignup ? "Join Unitus" : "Welcome back"}</h1>
        <p className="text-muted-foreground">
          {isSignup
            ? "Your PayPal account is your Unitus account. No new password to remember."
            : "Log in with the PayPal account you use for your chama."}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* A plain link: the server starts the PayPal OAuth flow and redirects. */}
      <a
        href={href}
        onClick={() => setRedirecting(true)}
        aria-disabled={redirecting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffc439] px-4 text-base font-semibold text-[#111] transition-[filter] outline-none hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:pointer-events-none aria-disabled:opacity-70"
      >
        {redirecting ? <Loader2Icon className="size-5 animate-spin" /> : <PayPalMark />}
        {isSignup ? "Sign up with PayPal" : "Log in with PayPal"}
      </a>

      <ul className="flex flex-col gap-3 rounded-2xl border p-4 text-sm">
        <li className="flex gap-3">
          <LockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          You sign in on PayPal&apos;s own page. Unitus never sees your password.
        </li>
        <li className="flex gap-3">
          <UserRoundCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          We only receive your name, email and PayPal account ID.
        </li>
        <li className="flex gap-3">
          <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          The same PayPal pays your contributions and receives your payout.
        </li>
      </ul>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? "Already a member? " : "New to Unitus? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">
          {isSignup ? "Log in" : "Create an account"}
        </Link>
        <span className="mt-2 block text-xs">
          No PayPal account? You can create one for free at{" "}
          <a href="https://www.paypal.com/signup" target="_blank" rel="noopener noreferrer" className="underline">
            paypal.com
          </a>
          .
        </span>
      </p>
    </div>
  );
}
