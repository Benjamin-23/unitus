import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/landing/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { PayPalMark } from "@/components/auth/paypal-button";
import { DEMO_GROUP, DEMO_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-svh flex-col bg-secondary/30">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-6 w-px bg-border md:block" />
            <span className="hidden text-sm font-medium lg:block">{DEMO_GROUP.name}</span>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/groups/new" className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}>
              <PlusIcon data-icon="inline-start" /> New chama
            </Link>
            <Badge variant="secondary" className="hidden h-7 gap-1.5 px-2.5 lg:flex">
              <PayPalMark className="size-3.5" /> {DEMO_USER.paypalEmail}
            </Badge>
            <ThemeToggle />
            <Avatar>
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">{DEMO_USER.initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
