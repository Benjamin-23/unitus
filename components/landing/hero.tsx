import Link from "next/link";
import { ArrowRightIcon, HandCoinsIcon, PiggyBankIcon, ShieldCheckIcon, TrophyIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MerryGoRoundIllustration } from "@/components/illustrations/merry-go-round";

function FloatingCard({
  className,
  icon,
  label,
  value,
  note,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center gap-3 rounded-2xl border bg-card/95 p-3 pr-4 shadow-lg shadow-primary/5 backdrop-blur",
        className,
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</div>
      <div className="leading-tight">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-lg font-semibold">{value}</p>
        <p className="text-[11px] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[520px] dark:opacity-40 bg-[radial-gradient(60%_60%_at_70%_30%,color-mix(in_oklch,var(--accent),transparent_70%),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div className="flex flex-col items-start">
          <Badge variant="secondary" className="mb-6 h-7 gap-1.5 px-3 text-xs">
            <span className="size-1.5 rounded-full bg-primary" />
            The chama, reimagined for families across the world
          </Badge>
          <h1 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Save together,{" "}
            <span className="relative whitespace-nowrap text-primary">
              grow together
              <svg viewBox="0 0 300 16" className="absolute -bottom-2 left-0 w-full" aria-hidden preserveAspectRatio="none">
                <path d="M3 11 C80 3 200 3 297 9" className="stroke-accent" strokeWidth={6} fill="none" strokeLinecap="round" />
              </svg>
            </span>
            , wherever you are.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
            Unitus runs your chama online. Members anywhere chip in monthly through PayPal, one member wins the
            merry-go-round each month, savings are shared out at year end, and anyone can borrow against what
            they&apos;ve saved.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href="/groups/new" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}>
              Start your chama
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <a href="#how-it-works" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 px-6 text-base")}>
              See how it works
            </a>
          </div>
          <div className="mt-10 flex items-center gap-4">
            <AvatarGroup>
              {["WK", "AO", "JM", "FN"].map((i, idx) => (
                <Avatar key={i} className="ring-2 ring-background">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-semibold",
                      ["bg-primary text-primary-foreground", "bg-accent text-accent-foreground", "bg-clay text-white", "bg-sky text-white"][idx],
                    )}
                  >
                    {i}
                  </AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Built for members abroad.</span>
              <br />
              Nairobi, London, Dubai, Toronto, one group.
            </p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <MerryGoRoundIllustration className="w-full" />
          <FloatingCard
            className="top-4 hidden animate-float sm:-left-8 sm:flex"
            icon={<TrophyIcon className="size-5" />}
            label="March winner"
            value="Wanjiru · $1,200"
            note="Drawn at random, sent via PayPal"
          />
          <FloatingCard
            className="bottom-2 hidden animate-float [animation-delay:1.5s] sm:-right-6 sm:flex"
            icon={<PiggyBankIcon className="size-5" />}
            label="Group savings"
            value="$14,850"
            note="Shared out in December"
          />
          <FloatingCard
            className="bottom-0 left-4 hidden animate-float [animation-delay:3s] sm:flex"
            icon={<HandCoinsIcon className="size-5" />}
            label="Loan approved"
            value="$600 at 5%"
            note="Up to 3× your savings"
          />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 border-t px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <span className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary" /> Payments processed by PayPal
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary" /> Every draw is recorded and auditable
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheckIcon className="size-4 text-primary" /> Rules agreed by members, not by us
        </span>
      </div>
    </section>
  );
}
