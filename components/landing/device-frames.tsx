import Image from "next/image";
import { cn } from "@/lib/utils";

export type Device = "desktop" | "tablet" | "phone";

/**
 * A screenshot from public/screens (made by scripts/capture-screens.py), in the
 * light or dark version to match the site theme. With `scroll`, the screen pans
 * slowly from top to bottom and back, like a short screen recording.
 */
export function Screen({
  name,
  device,
  alt,
  scroll = true,
  duration = 16,
  priority,
}: {
  name: string;
  device: Device;
  alt: string;
  scroll?: boolean;
  /** Seconds for one pass from top to bottom. */
  duration?: number;
  priority?: boolean;
}) {
  const sizes = device === "desktop" ? "(min-width: 1024px) 760px, 100vw" : "(min-width: 640px) 320px, 80vw";
  const common = {
    fill: true,
    sizes,
    priority,
    // Captures are already compressed WebP at the right size.
    unoptimized: true,
    className: cn("object-cover object-top", scroll && "screen-scroll"),
    style: scroll ? ({ "--scroll-duration": `${duration}s` } as React.CSSProperties) : undefined,
  };
  return (
    <>
      <Image src={`/screens/${name}-${device}-light.webp`} alt={alt} {...common} className={cn(common.className, "dark:hidden")} />
      <Image src={`/screens/${name}-${device}-dark.webp`} alt="" aria-hidden {...common} className={cn(common.className, "hidden dark:block")} />
    </>
  );
}

export function BrowserFrame({ url, children, className }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-black/10 dark:shadow-black/40", className)}>
      <div className="flex h-9 items-center gap-3 border-b bg-muted/60 px-4">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-clay/70" />
          <span className="size-2.5 rounded-full bg-accent/80" />
          <span className="size-2.5 rounded-full bg-primary/60" />
        </div>
        <div className="mx-auto w-1/2 truncate rounded-md bg-background/80 px-3 py-0.5 text-center text-xs text-muted-foreground">
          {url}
        </div>
        <span className="w-10" aria-hidden />
      </div>
      <div className="relative aspect-[16/10] overflow-hidden">{children}</div>
    </div>
  );
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[2.4rem] bg-[#101a15] p-2 shadow-2xl ring-1 shadow-black/25 ring-black/10 dark:ring-white/10", className)}>
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2rem] bg-background">
        <span className="absolute top-2 left-1/2 z-10 h-5 w-1/3 -translate-x-1/2 rounded-full bg-[#101a15]" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function TabletFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[1.8rem] bg-[#101a15] p-3 shadow-2xl ring-1 shadow-black/25 ring-black/10 dark:ring-white/10", className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.1rem] bg-background">{children}</div>
    </div>
  );
}
