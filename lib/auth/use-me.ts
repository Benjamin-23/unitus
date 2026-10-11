"use client";

import { useEffect, useState } from "react";

export type Me = {
  id: string;
  name: string | null;
  email: string | null;
  paypalVerified: boolean;
  /** PayPal's own account page, where the member can see their balance. */
  paypalAccountUrl: string;
  /** Unitus staff who may view the platform wallet. */
  isOperator: boolean;
};

// One request per page load, shared by every component that asks.
let mePromise: Promise<Me | null> | null = null;

function loadMe() {
  mePromise ??= fetch("/api/auth/me")
    .then((res) => (res.ok ? res.json() : { member: null }))
    .then((data) => (data.member ? ({ ...data.member, paypalAccountUrl: data.paypalAccountUrl, isOperator: Boolean(data.isOperator) } as Me) : null))
    .catch(() => null);
  return mePromise;
}

/** The signed-in member, or null while loading / when signed out. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadMe().then((m) => {
      if (!cancelled) setMe(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return me;
}

export function FirstName({ fallback = "there" }: { fallback?: string }) {
  const me = useMe();
  return me?.name?.split(" ")[0] ?? fallback;
}
