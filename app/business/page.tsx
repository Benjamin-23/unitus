import type { Metadata } from "next";
import { BadgePercentIcon, ShieldCheckIcon, TrophyIcon, UsersIcon } from "lucide-react";
import { PartnerApply } from "@/components/marketplace/partner-apply";
import { money } from "@/lib/chama";
import { REFERRAL_FEE } from "@/lib/marketplace";
import { DEMAND } from "@/lib/marketplace-data";

export const metadata: Metadata = { title: "Partner with Unitus" };

const POINTS = [
  {
    icon: TrophyIcon,
    title: "Reach members with money to spend",
    body: "Every month, chama winners receive a lump sum. Your offer is shown to them, ranked by how well it fits their payout.",
  },
  {
    icon: BadgePercentIcon,
    title: "Pay only when you sell",
    body: `No listing fees. Unitus takes ${REFERRAL_FEE * 100}% of each sale; members pay you directly through PayPal.`,
  },
  {
    icon: UsersIcon,
    title: "Sell big items with instalments",
    body: "Cars, motorbikes, solar: let members put their payout down as a deposit and pay you the rest monthly.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Members stay private",
    body: "You see demand in totals, never names or contacts. Members choose whether to see offers at all.",
  },
];

export default function BusinessPage() {
  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <span className="text-sm font-semibold tracking-wide text-primary uppercase">Unitus for business</span>
          <h1 className="font-heading text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
            Sell to chama winners the month they get paid
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            List member-only offers on TVs, phones, cars, solar and more. Unitus matches them to each member&apos;s merry-go-round
            payout.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 rounded-3xl bg-band p-6 text-band-foreground">
          <div>
            <dt className="text-xs text-band-foreground/70">Winners this month</dt>
            <dd className="font-heading text-2xl font-semibold sm:text-3xl">{DEMAND.winnersThisMonth.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-xs text-band-foreground/70">Paid out this month</dt>
            <dd className="font-heading text-2xl font-semibold sm:text-3xl">{money(DEMAND.totalPayoutsThisMonth)}</dd>
          </div>
          <div>
            <dt className="text-xs text-band-foreground/70">Members seeing offers</dt>
            <dd className="font-heading text-2xl font-semibold sm:text-3xl">{Math.round(DEMAND.optedIn * 100)}%</dd>
          </div>
        </dl>
        <p className="-mt-6 text-xs text-muted-foreground">Sample figures for the demo.</p>
        <ul className="grid gap-6 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title} className="flex flex-col gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <p.icon className="size-5" />
              </div>
              <h2 className="font-semibold">{p.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <PartnerApply />
      </div>
    </main>
  );
}
