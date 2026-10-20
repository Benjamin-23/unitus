"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/auth/use-me";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/my-wallet", label: "My wallet" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/offers", label: "Offers" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const me = useMe();
  const links = me?.isOperator ? [...LINKS, { href: "/dashboard/wallet", label: "Unitus wallet" }] : LINKS;
  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
