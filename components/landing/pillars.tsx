import { CheckIcon, HandCoinsIcon, PiggyBankIcon, RefreshCwIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MerryGoRoundIllustration } from "@/components/illustrations/merry-go-round";
import { LoanIllustration, SavingsJarIllustration } from "@/components/illustrations/pillars";
import { SectionHeading } from "./section-heading";

const PILLARS = [
  {
    value: "merry-go-round",
    tab: "Merry-go-round",
    icon: RefreshCwIcon,
    title: "One member takes home the pot every month",
    body: "Each member pays the agreed monthly contribution. When the pot is complete, Unitus draws one member at random from those who haven't won yet. Over the cycle, everyone gets a turn.",
    points: ["Fair random draw, recorded for everyone to see", "Each member wins exactly once per cycle", "Payout goes straight to the winner's PayPal"],
    example: [
      ["Members", "10"],
      ["Contribution", "$100 / month"],
      ["Monthly payout", "$1,000"],
    ],
    Illustration: MerryGoRoundIllustration,
  },
  {
    value: "savings",
    tab: "Savings",
    icon: PiggyBankIcon,
    title: "A shared savings pool that pays out together",
    body: "On top of the merry-go-round, members put away a monthly savings amount. The pool grows through the year, earns interest from member loans, and is shared out mid-year or at year end, whichever your group chose.",
    points: ["Each member's savings tracked individually", "Loan interest flows back into the pool", "Share-out date agreed when the group is created"],
    example: [
      ["Savings", "$50 / month"],
      ["Pool after 12 months", "$6,000"],
      ["Your share", "$600 + interest"],
    ],
    Illustration: SavingsJarIllustration,
  },
  {
    value: "loans",
    tab: "Loans",
    icon: HandCoinsIcon,
    title: "Borrow from your chama, not a stranger",
    body: "Members can borrow from the savings pool. How much depends on how much you've saved, and the interest rate is set by the group, so the interest you pay goes back to your own people.",
    points: ["Limit based on your savings (e.g. 3×)", "Interest rate fixed when the group is created", "Repayments tracked alongside contributions"],
    example: [
      ["Your savings", "$300"],
      ["Loan limit (3×)", "$900"],
      ["Group rate", "5% flat"],
    ],
    Illustration: LoanIllustration,
  },
];

export function Pillars() {
  return (
    <section id="features" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          className="reveal"
          eyebrow="Three ways to grow"
          title="Merry-go-round, savings and loans in one group"
          description="Every Unitus chama combines the three things a chama does best. You set the amounts, and we handle the maths."
        />
        <Tabs defaultValue="merry-go-round" className="mt-12 items-center gap-10">
          <TabsList className="h-auto! w-full max-w-lg rounded-2xl p-1.5">
            {PILLARS.map((p) => (
              <TabsTrigger key={p.value} value={p.value} className="h-11 rounded-xl text-sm sm:text-base">
                <p.icon />
                {p.tab}
              </TabsTrigger>
            ))}
          </TabsList>
          {PILLARS.map((p) => (
            <TabsContent key={p.value} value={p.value} className="w-full">
              <div className="grid items-center gap-10 rounded-3xl border bg-card p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
                <div className="mx-auto w-full max-w-sm">
                  <p.Illustration className="w-full" idPrefix={`pillar-${p.value}`} />
                </div>
                <div className="flex flex-col gap-6">
                  <h3 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{p.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{p.body}</p>
                  <ul className="flex flex-col gap-3">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3 text-base">
                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <CheckIcon className="size-3.5" />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <dl className="grid grid-cols-3 divide-x rounded-2xl bg-secondary/60">
                    {p.example.map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1 p-4">
                        <dt className="text-xs text-muted-foreground">{k}</dt>
                        <dd className="font-heading text-base font-semibold sm:text-lg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
