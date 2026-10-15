"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, CopyIcon, LockIcon, PlusIcon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { money } from "@/lib/chama";
import type { ChamaPreview } from "@/lib/chamas";
import { cn } from "@/lib/utils";
import { perRound } from "@/lib/schedule";

function CopyLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await navigator.clipboard?.writeText(`${window.location.origin}/join/${code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <CheckIcon className="text-primary" /> : <CopyIcon />}
      {copied ? "Link copied" : "Copy invite link"}
    </Button>
  );
}

/** The signed-in member's real chamas (from the database). */
export function MyChamas() {
  const [chamas, setChamas] = useState<ChamaPreview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chamas")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Couldn't load your chamas.");
        if (!cancelled) setChamas(data.chamas);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="font-heading text-xl">Your chamas</CardTitle>
          <CardDescription>Share a chama&apos;s link or code so members can join.</CardDescription>
        </div>
        <Link href="/groups/new" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
          <PlusIcon data-icon="inline-start" /> New chama
        </Link>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && chamas === null && <div className="h-20 animate-pulse rounded-2xl bg-muted" />}
        {chamas?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-8 text-center">
            <UsersIcon className="size-6 text-muted-foreground" />
            <p className="font-medium">You&apos;re not in a chama yet</p>
            <p className="text-sm text-muted-foreground">
              Start one, or{" "}
              <Link href="/onboarding" className="text-primary underline">
                join with an invite code
              </Link>
              .
            </p>
          </div>
        )}
        {chamas && chamas.length > 0 && (
          <ul className="flex flex-col divide-y">
            {chamas.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-lg font-semibold">{c.name}</span>
                    {(c.you?.role === "admin" || (c.you?.role === "member" && c.you.isCreator)) && <Badge variant="secondary">Admin</Badge>}
                    {c.you?.role === "member" && <Badge variant="secondary">Member</Badge>}
                    <Badge variant="outline" className="gap-1">
                      <LockIcon className="size-3" /> Rules locked
                    </Badge>
                    <Badge className={cn("border-0", c.status === "open" ? "bg-accent/30 text-accent-foreground" : "bg-secondary text-primary")}>
                      {c.status === "closed" ? "Closed" : c.status === "active" ? "Running" : "Not started"}
                      {c.status !== "closed" && c.memberCount < c.memberLimit ? " · accepting members" : ""}
                    </Badge>
                  </div>
                  {c.you?.role === "admin" && (
                    <p className="text-xs text-muted-foreground">
                      You manage this chama. To take part too, join it with its invite code and pay the joining fee.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {c.memberCount} of {c.memberLimit} members · {money(c.rules.monthlyContribution)} / {perRound(c.frequency)} · {c.status === "active" ? "running" : c.status === "open" ? "not started" : "closed"} ·{" "}
                    <span className="font-mono">{c.inviteCode}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {c.status !== "closed" && c.memberCount < c.memberLimit && <CopyLink code={c.inviteCode} />}
                  {c.you?.role === "member" &&
                    (c.you.joiningFeePaid ? (
                      <span className="flex items-center gap-1 text-sm text-primary">
                        <CheckIcon className="size-4" /> Fee paid
                      </span>
                    ) : (
                      <Link href={`/onboarding?code=${c.inviteCode}`} className={buttonVariants({ size: "sm" })}>
                        Pay joining fee
                      </Link>
                    ))}
                  {c.you?.role === "admin" && c.status !== "closed" && c.memberCount < c.memberLimit && (
                    <Link href={`/onboarding?code=${c.inviteCode}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                      Join as a member too
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
