import { BanIcon, LockIcon, Trash2Icon } from "lucide-react";
import { AUTOMATIC_PAYOUTS } from "@/lib/chama";
import { PhoneFrame, Screen } from "./device-frames";
import { SectionHeading } from "./section-heading";

const RULES = [
  {
    icon: LockIcon,
    title: "Rules lock when the chama starts",
    body: "Contributions, savings, joining fee and loan terms are agreed once. Nobody, not even the admin, can quietly change them later.",
  },
  {
    icon: BanIcon,
    title: "Nobody can withdraw from the pot",
    body: "There's no withdraw button for anyone. Money only leaves through payouts the rules already define.",
  },
  {
    icon: Trash2Icon,
    title: "Closing only when everyone is square",
    body: "A chama can only be deleted once every member has had their payout, savings are shared out and loans are repaid.",
  },
];

export function TrustSection() {
  return (
    <section id="trust" className="scroll-mt-20 overflow-hidden bg-secondary/40 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-10">
          <SectionHeading
            align="left"
            className="reveal"
            eyebrow="Rules you can trust"
            title="The chama treasurer is the code"
            description="Most chama arguments are about money that moved when it shouldn't have. Unitus makes that impossible."
          />
          <ul className="flex flex-col gap-6">
            {RULES.map((r) => (
              <li key={r.title} className="reveal flex gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-band text-band-foreground">
                  <r.icon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="reveal rounded-2xl border bg-card p-5">
            <p className="mb-3 text-sm font-semibold">Money only ever leaves the chama for:</p>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {AUTOMATIC_PAYOUTS.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-primary">•</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="reveal relative mx-auto w-64 sm:w-72">
          <div aria-hidden className="absolute -inset-10 -z-10 rounded-full bg-accent/25 blur-3xl" />
          <PhoneFrame>
            <Screen name="create" device="phone" alt="Creating a chama on a phone, with a preview of the locked rules" duration={14} />
          </PhoneFrame>
          <div className="absolute top-60 -left-14 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-semibold shadow-lg animate-float sm:-left-20">
            <LockIcon className="size-4 text-primary" /> Rules locked
          </div>
          <div className="absolute -right-10 bottom-28 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm font-semibold shadow-lg animate-float [animation-delay:2s] sm:-right-16">
            <BanIcon className="size-4 text-clay" /> Withdrawals off
          </div>
        </div>
      </div>
    </section>
  );
}
