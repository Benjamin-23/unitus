import { BellRingIcon, EyeIcon, GlobeIcon, VoteIcon } from "lucide-react";
import { GlobeConnectIllustration } from "@/components/illustrations/globe-connect";
import { SectionHeading } from "./section-heading";

const FEATURES = [
  {
    icon: GlobeIcon,
    title: "Contribute from any country",
    body: "Pay in through PayPal wherever you live. No bank queues and no sending cash home through a relative.",
  },
  {
    icon: EyeIcon,
    title: "Everyone sees the same ledger",
    body: "Every contribution, draw, loan and repayment is visible to every member, all the time.",
  },
  {
    icon: BellRingIcon,
    title: "Gentle reminders, not awkward calls",
    body: "Unitus reminds members before contributions are due, so the treasurer doesn't have to chase anyone.",
  },
  {
    icon: VoteIcon,
    title: "Rules decided together",
    body: "Amounts, share-out dates and interest rates are agreed when the group starts, and they're the same for everyone.",
  },
];

export function Distance() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <GlobeConnectIllustration className="mx-auto w-full max-w-[500px]" />
        </div>
        <div className="order-1 flex flex-col gap-10 lg:order-2">
          <SectionHeading
            align="left"
            className="reveal"
            eyebrow="Far apart, still together"
            title="A chama for people who can't meet every month"
            description="Siblings in different countries, old classmates, colleagues who moved abroad. Unitus keeps your group saving together even when you can't sit in the same room."
          />
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col gap-2">
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/30 text-accent-foreground dark:text-accent">
                  <f.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
