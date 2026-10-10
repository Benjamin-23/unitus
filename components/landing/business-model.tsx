import Link from "next/link";
import { ArrowRightIcon, BadgePercentIcon, HandCoinsIcon, PiggyBankIcon, StoreIcon, TrophyIcon, UsersIcon, XIcon, CheckIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { REFERRAL_FEE } from "@/lib/marketplace";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { SectionHeading } from "./section-heading";

const PROBLEMS = [
  "Members abroad can't make the monthly meeting",
  "Cash and transfers sit with one treasurer, on trust",
  "Rules change quietly and the draw gets disputed",
  "Records live in someone's notebook or spreadsheet",
];

const SOLUTIONS = [
  "Contribute by PayPal from any country",
  "Money sits in the chama's own account; nobody can withdraw",
  "Rules lock at creation; the draw is random and recorded",
  "Every shilling and dollar in one shared ledger",
];

const LOOP = [
  { icon: PiggyBankIcon, title: "Members save", body: "Contributions and savings are collected automatically every month." },
  { icon: TrophyIcon, title: "A winner gets paid", body: "One member receives the pot: real money, ready to spend." },
  { icon: StoreIcon, title: "Businesses compete", body: "Partners offer member prices on what winners actually buy." },
  { icon: BadgePercentIcon, title: "Unitus earns", body: `A ${REFERRAL_FEE * 100}% referral fee on each sale keeps chamas free.` },
];

const WINNERS = [
  { icon: UsersIcon, who: "Members", gain: "Save, borrow and win with no membership fee, plus member-only prices." },
  { icon: HandCoinsIcon, who: "Chamas", gain: "No treasurer risk, no meetings, no arguments about the rules." },
  { icon: StoreIcon, who: "Businesses", gain: "Customers who've just been paid, and payment only when they sell." },
];

export function BusinessModel() {
  return (
    <section id="idea" className="scroll-mt-20 py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 sm:px-6">
        <SectionHeading
          className="reveal"
          eyebrow="The idea"
          title="A chama that pays for itself"
          description="Chamas help families and friends save together, but they run on meetings, cash and trust. Unitus moves the whole chama online and earns from businesses, not from members."
        />

        {/* Problem → solution */}
        <div className="reveal grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border bg-card p-6 sm:p-8">
            <p className="mb-5 text-sm font-semibold tracking-wide text-clay uppercase">The problem</p>
            <ul className="flex flex-col gap-4">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-clay/15 text-clay">
                    <XIcon className="size-3.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-band p-6 text-band-foreground sm:p-8">
            <p className="mb-5 text-sm font-semibold tracking-wide text-accent uppercase">With Unitus</p>
            <ul className="flex flex-col gap-4">
              {SOLUTIONS.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <CheckIcon className="size-3.5" />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* The loop that funds it */}
        <div className="flex flex-col gap-8">
          <div className="reveal flex flex-col items-center gap-2 text-center">
            <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">How Unitus makes money</h3>
            <p className="max-w-xl text-muted-foreground">
              Every monthly payout creates a buyer. Businesses pay to reach them, so chamas don&apos;t have to.
            </p>
          </div>

          <div className="reveal relative mx-auto grid w-full max-w-4xl gap-4 sm:grid-cols-2">
            {/* The loop's centre on larger screens */}
            <div aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center sm:flex">
              <div className="flex size-28 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-background shadow-lg">
                <LogoMark className="size-14" />
              </div>
            </div>
            {LOOP.map((step, i) => (
              <div
                key={step.title}
                className={cn(
                  "relative flex gap-4 rounded-3xl border bg-card p-6",
                  // Order around the loop: top-left, top-right, bottom-right, bottom-left.
                  i === 2 && "sm:order-4",
                  i === 3 && "sm:order-3",
                  i % 3 === 0 ? "sm:pr-16" : "sm:pl-16",
                )}
              >
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-primary">
                  <step.icon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold text-primary">Step {i + 1}</p>
                  <h4 className="font-semibold">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="reveal text-center text-sm text-muted-foreground">…and step 4 keeps step 1 free. Standard PayPal fees apply to payments.</p>
        </div>

        {/* Who wins */}
        <div className="reveal grid gap-4 md:grid-cols-3">
          {WINNERS.map((w) => (
            <div key={w.who} className="flex flex-col gap-3 rounded-3xl border bg-secondary/40 p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-band text-band-foreground">
                  <w.icon className="size-5" />
                </div>
                <p className="font-heading text-lg font-semibold">{w.who}</p>
              </div>
              <p className="text-sm text-muted-foreground">{w.gain}</p>
            </div>
          ))}
        </div>

        <div className="reveal flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/groups/new" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")}>
            Start a chama <ArrowRightIcon data-icon="inline-end" />
          </Link>
          <Link href="/business" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-5")}>
            Partner as a business
          </Link>
        </div>
      </div>
    </section>
  );
}
