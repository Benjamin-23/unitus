"use client";

import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Simple PayPal monogram for buttons (two overlapping Ps in brand blues). */
export function PayPalMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <path d="M8.2 21.5H4.6L7.6 3h6.1c3.4 0 5.4 1.8 4.8 5-.7 3.8-3.4 5.3-6.9 5.3H9.7z" fill="#003087" />
      <path d="M10.5 22h-3l.6-3.8 1.4-8.4h4.1c3 0 4.9 1.5 4.3 4.4-.6 3.2-2.9 4.4-5.9 4.4h-.9z" fill="#009cde" fillOpacity={0.9} />
    </svg>
  );
}

export function PayPalButton({
  children,
  loading,
  className,
  ...props
}: React.ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button
      type="button"
      disabled={loading || props.disabled}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ffc439] px-4 text-sm font-semibold text-[#111] transition-[filter] outline-none hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <PayPalMark />}
      {children}
    </button>
  );
}
