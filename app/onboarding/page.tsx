import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo } from "@/components/landing/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Get started · Unitus" };

export default function OnboardingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-secondary/30">
      <header className="border-b bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 px-4 py-10 sm:py-16">
        <Suspense>
          <OnboardingFlow />
        </Suspense>
      </main>
    </div>
  );
}
