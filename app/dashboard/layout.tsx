import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/landing/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-svh flex-col bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-border md:block" />
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/groups/new" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
              <PlusIcon data-icon="inline-start" /> New chama
            </Link>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
