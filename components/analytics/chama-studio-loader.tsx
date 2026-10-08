"use client";

import dynamic from "next/dynamic";

// AG Studio measures the DOM and canvas on mount, so it only renders in the browser.
export const ChamaStudioLoader = dynamic(() => import("./chama-studio").then((m) => m.ChamaStudio), {
  ssr: false,
  loading: () => <div className="h-[960px] animate-pulse rounded-3xl border bg-card" />,
});
