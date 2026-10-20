"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";

const EVERY_MS = 10_000;
/** Start watching this long before a round is due, and keep going this long after. */
const BEFORE_DUE_MS = 60_000;
const AFTER_DUE_MS = 5 * 60_000;

/**
 * Re-renders the dashboard every few seconds, but only while something is
 * about to change: PayPal finishing saving a member's PayPal (webhook), a
 * round being collected or paid out, or the next round coming due. Pauses
 * while the tab is hidden and catches up as soon as it's shown again.
 */
export function LiveRefresh({ pending, dueAt }: { pending: boolean; dueAt: string | null }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const due = dueAt ? Date.parse(dueAt) : NaN;
  const nearDue = Number.isFinite(due) && now >= due - BEFORE_DUE_MS && now <= due + AFTER_DUE_MS;
  const live = pending || nearDue;

  // Wake up when the next round comes near, even if nothing is pending now.
  useEffect(() => {
    if (live || !Number.isFinite(due)) return;
    const wait = due - BEFORE_DUE_MS - Date.now();
    if (wait <= 0 || wait > 2 ** 31 - 1) return;
    const t = setTimeout(() => setNow(Date.now()), wait);
    return () => clearTimeout(t);
  }, [live, due]);

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
    };
    const id = setInterval(tick, EVERY_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, router]);

  if (!live) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <RefreshCwIcon className="size-3 animate-spin [animation-duration:3s]" />
      Updating automatically
    </p>
  );
}
