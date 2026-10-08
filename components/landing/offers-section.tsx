import Link from "next/link";
import { ArrowRightIcon, CarIcon, CheckIcon, SmartphoneIcon, StoreIcon, TvIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { money } from "@/lib/chama";
import { REFERRAL_FEE } from "@/lib/marketplace";
import { DEMAND } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";
import { Screen, TabletFrame } from "./device-frames";
import { SectionHeading } from "./section-heading";

const POINTS = [
  "Deals sized to your payout, so you know what it covers before you buy",
  "Use your payout as a deposit on bigger items like cars and motorbikes",
  "Businesses never see your name or contacts, and you can hide offers any time",
];

export function OffersSection() {
  return (
    <section id="offers" className="scroll-mt-20 overflow-hidden py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="reveal relative order-2 mx-auto w-full max-w-sm lg:order-1">
          <TabletFrame>
            <Screen name="offers" device="tablet" alt="Partner offers matched to a member's payout, on a tablet" duration={22} />
          </TabletFrame>
          {[
            { icon: TvIcon, label: "Smart TV · $329", className: "-left-6 top-16 sm:-left-16" },
            { icon: SmartphoneIcon, label: "Phone · $219", className: "-right-4 top-1/2 sm:-right-14 [animation-delay:1.5s]" },
            { icon: CarIcon, label: "Car · $1,000 deposit", className: "-left-4 bottom-12 sm:-left-12 [animation-delay:3s]" },
          ].map((c) => (
            <div
              key={c.label}
              className={cn("absolute flex items-center gap-2 rounded-2xl border bg-card px-3 py-2.5 text-sm font-semibold shadow-lg animate-float", c.className)}
            >
              <c.icon className="size-4 text-primary" /> {c.label}
            </div>
          ))}
        </div>

        <div className="order-1 flex flex-col gap-8 lg:order-2">
          <SectionHeading
            align="left"
            className="reveal"
            eyebrow="Win, then shop"
            title="Your payout, worth more"
            description="When the merry-go-round lands on you, partner businesses compete for it with member-only prices."
          />
          <ul className="reveal flex flex-col gap-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CheckIcon className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div className="reveal flex flex-col gap-4 rounded-3xl bg-band p-6 text-band-foreground">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <StoreIcon className="size-5" />
              </div>
              <p className="font-heading text-xl font-semibold">Run a business?</p>
            </div>
            <p className="text-sm text-band-foreground/80">
              Reach {DEMAND.winnersThisMonth.toLocaleString()} winners sharing {money(DEMAND.totalPayoutsThisMonth)} this month (sample
              figures). No listing fees, just {REFERRAL_FEE * 100}% per sale.
            </p>
            <Link
              href="/business"
              className={cn(buttonVariants({ size: "lg" }), "h-11 w-fit bg-accent px-5 text-accent-foreground hover:bg-accent/85")}
            >
              Become a partner <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
