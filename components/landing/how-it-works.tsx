import { CalendarCheckIcon, SettingsIcon, ShuffleIcon, WalletIcon } from "lucide-react";
import { SectionHeading } from "./section-heading";

const STEPS = [
  {
    icon: SettingsIcon,
    title: "Create the group and set the rules",
    body: "Choose the monthly merry-go-round contribution, the monthly savings amount, when savings are shared out (mid-year or year end) and the loan interest rate. Once you create the chama, the rules are locked. Then invite members.",
  },
  {
    icon: WalletIcon,
    title: "Connect the group's PayPal account",
    body: "Link the PayPal business account your chama agreed on. Every contribution goes there, so the money never sits with one person.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Everyone contributes each month",
    body: "Members pay their share from anywhere in the world. Unitus tracks who has paid, sends reminders and keeps an open ledger.",
  },
  {
    icon: ShuffleIcon,
    title: "A winner is drawn and paid",
    body: "Once the month's pot is complete, one member who hasn't won yet is picked at random and receives the merry-go-round payout.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-secondary/40 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          className="reveal"
          eyebrow="How it works"
          title="Your chama's rules, run automatically"
          description="The same chama you'd run at a monthly meeting, without the meeting, the cash or the spreadsheet."
        />
        <ol className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div aria-hidden className="absolute top-7 right-[12%] left-[12%] hidden h-px border-t-2 border-dashed border-primary/25 lg:block" />
          {STEPS.map((s, i) => (
            <li key={s.title} className="reveal relative flex flex-col gap-4 rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <s.icon className="size-6" />
                </div>
                <span className="font-heading text-4xl font-semibold text-primary/15">0{i + 1}</span>
              </div>
              <h3 className="font-heading text-lg font-semibold leading-snug">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
