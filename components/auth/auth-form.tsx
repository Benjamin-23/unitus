"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PayPalButton } from "./paypal-button";

type Mode = "login" | "signup";

// TODO(backend): replace the timeouts with real auth calls. "Log in with PayPal"
// should start PayPal's OAuth flow; email sign-up should create the account.
const fakeRequest = () => new Promise((r) => setTimeout(r, 900));

function PasswordInput({ id, autoComplete }: { id: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={id} type={visible ? "text" : "password"} autoComplete={autoComplete} required minLength={8} className="h-11 pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, setPending] = useState<"email" | "paypal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function onPayPal() {
    setPending("paypal");
    await fakeRequest();
    // PayPal sign-up already has a connected PayPal account, so onboarding skips that step.
    router.push(isSignup ? "/onboarding?via=paypal" : "/dashboard");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (isSignup && form.get("password") !== form.get("confirm")) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setPending("email");
    await fakeRequest();
    router.push(isSignup ? "/onboarding" : "/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {isSignup ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground">
          {isSignup
            ? "Join your chama in a few minutes. You'll connect PayPal next."
            : "Log in to check your savings, loans and this month's draw."}
        </p>
      </div>

      <PayPalButton onClick={onPayPal} loading={pending === "paypal"} disabled={pending !== null}>
        {isSignup ? "Sign up with PayPal" : "Log in with PayPal"}
      </PayPalButton>

      <FieldSeparator>or with email</FieldSeparator>

      <form onSubmit={onSubmit}>
        <FieldGroup className="gap-5">
          {isSignup && (
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input id="name" name="name" autoComplete="name" required className="h-11" />
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required className="h-11" />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              {!isSignup && (
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              )}
            </div>
            <PasswordInput id="password" autoComplete={isSignup ? "new-password" : "current-password"} />
            {isSignup && <FieldDescription>At least 8 characters.</FieldDescription>}
          </Field>
          {isSignup && (
            <Field>
              <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
              <PasswordInput id="confirm" autoComplete="new-password" />
            </Field>
          )}
          {isSignup && (
            <Field orientation="horizontal">
              <Checkbox id="terms" name="terms" required />
              <FieldLabel htmlFor="terms" className="font-normal text-muted-foreground">
                I agree to the chama rules and the Terms of use
              </FieldLabel>
            </Field>
          )}
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" size="lg" className="h-11 text-sm" disabled={pending !== null}>
            {pending === "email" && <Loader2Icon className="animate-spin" />}
            {isSignup ? "Create account" : "Log in"}
          </Button>
        </FieldGroup>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account? " : "New to Unitus? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
