"use client";

import { BadgeCheckIcon, LogOutIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/lib/auth/use-me";

function initials(name: string | null, email: string | null) {
  const source = name?.trim() || email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function UserMenu() {
  const me = useMe();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu" />}>
        <Avatar>
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {me ? initials(me.name, me.email) : "··"}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="font-semibold text-foreground">{me?.name ?? "Signed in"}</span>
            {me?.email && <span className="text-xs font-normal">{me.email}</span>}
            {me?.paypalVerified && (
              <span className="mt-1 flex items-center gap-1 text-xs font-normal text-primary">
                <BadgeCheckIcon className="size-3.5" /> Verified PayPal account
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
            <LogOutIcon className="size-4" /> Log out
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
