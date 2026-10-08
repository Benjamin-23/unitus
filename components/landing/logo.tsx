import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <circle cx={16} cy={16} r={16} className="fill-primary" />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={16 + 9 * Math.cos(a)}
            cy={16 + 9 * Math.sin(a)}
            r={2.6}
            className={i === 0 ? "fill-accent" : "fill-primary-foreground"}
          />
        );
      })}
      <circle cx={16} cy={16} r={3.4} className="fill-accent" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-xl font-semibold tracking-tight">Unitus</span>
    </Link>
  );
}
