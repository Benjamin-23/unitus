"use client";

import { useState } from "react";
import { HandCoinsIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function RangeField({
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-heading text-lg font-semibold text-primary">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
      />
    </label>
  );
}

export function LoanCalculator() {
  const [savings, setSavings] = useState(300);
  const [multiplier, setMultiplier] = useState(3);
  const [rate, setRate] = useState(5);
  const [months, setMonths] = useState(6);

  const limit = savings * multiplier;
  const interest = limit * (rate / 100);
  const monthly = (limit + interest) / months;

  return (
    <section id="loans" className="scroll-mt-20 bg-band py-24 text-band-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div className="[&_h2]:text-band-foreground [&_p]:text-band-foreground/75 [&_span]:text-accent">
          <SectionHeading
            align="left"
            eyebrow="Member loans"
            title="The more you save, the more you can borrow"
            description="Your loan limit grows with your savings. The interest rate is agreed when the group is created, and every cent of interest goes back into the members' savings pool."
          />
          <ul className="mt-8 flex flex-col gap-3 text-band-foreground/85">
            <li>• Loan limit = your savings × the group&apos;s multiplier</li>
            <li>• Flat interest, fixed for the life of the group</li>
            <li>• Repay in monthly instalments alongside your contribution</li>
          </ul>
        </div>

        <Card className="gap-0 rounded-3xl py-0 text-card-foreground shadow-2xl shadow-black/20">
          <CardHeader className="border-b p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <HandCoinsIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="font-heading text-lg">Loan calculator</CardTitle>
                <CardDescription>Try your group&apos;s numbers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 p-6">
            <RangeField label="Your total savings" value={savings} display={usd.format(savings)} min={50} max={5000} step={50} onChange={setSavings} />
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Group loan multiplier</span>
              <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Group loan multiplier">
                {[1, 2, 3, 4].map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={multiplier === m}
                    onClick={() => setMultiplier(m)}
                    className={cn(
                      "h-10 rounded-lg border text-sm font-semibold transition-colors",
                      multiplier === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    {m}×
                  </button>
                ))}
              </div>
            </div>
            <RangeField label="Group interest rate (flat)" value={rate} display={`${rate}%`} min={1} max={20} step={1} onChange={setRate} />
            <RangeField label="Repayment period" value={months} display={`${months} month${months > 1 ? "s" : ""}`} min={1} max={12} step={1} onChange={setMonths} />

            <Separator />

            <dl className="grid grid-cols-3 gap-4" aria-live="polite">
              <div>
                <dt className="text-xs text-muted-foreground">You can borrow</dt>
                <dd className="font-heading text-2xl font-semibold text-primary">{usd.format(limit)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Monthly repayment</dt>
                <dd className="font-heading text-2xl font-semibold">{usd.format(monthly)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Interest to the pool</dt>
                <dd className="font-heading text-2xl font-semibold">{usd.format(interest)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
