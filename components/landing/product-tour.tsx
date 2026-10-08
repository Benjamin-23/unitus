"use client";

import { useState } from "react";
import { BarChart3Icon, LayoutDashboardIcon, PlusCircleIcon, ShoppingBagIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrowserFrame, PhoneFrame, Screen, TabletFrame, type Device } from "./device-frames";
import { SectionHeading } from "./section-heading";

// To add a screen: capture it with scripts/capture-screens.py, then add an entry here.
const STEPS: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  url: string;
  screen: string;
  second: Exclude<Device, "desktop">;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboardIcon,
    title: "Your chama at a glance",
    body: "Savings, this month's draw, your loan and the next auto-deduction, on your laptop or your phone.",
    url: "unitus.app/dashboard",
    screen: "dashboard",
    second: "phone",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3Icon,
    title: "See where the money goes",
    body: "Live charts of contributions, payouts, savings by country and loans per member. Click a chart to filter the rest.",
    url: "unitus.app/dashboard/analytics",
    screen: "analytics",
    second: "tablet",
  },
  {
    id: "offers",
    label: "Offers",
    icon: ShoppingBagIcon,
    title: "Make your payout go further",
    body: "Member deals on TVs, phones, solar and even cars, ranked by how well they fit your merry-go-round payout.",
    url: "unitus.app/dashboard/offers",
    screen: "offers",
    second: "phone",
  },
  {
    id: "create",
    label: "Start a chama",
    icon: PlusCircleIcon,
    title: "Set the rules once, in five minutes",
    body: "Pick the contribution, savings, joining fee and loan terms. A live preview shows the payout before you lock it in.",
    url: "unitus.app/groups/new",
    screen: "create",
    second: "phone",
  },
];

const DURATION = 9;

export function ProductTour() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const step = STEPS[index];
  const Second = step.second === "phone" ? PhoneFrame : TabletFrame;

  return (
    <section id="tour" className="scroll-mt-20 overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          className="reveal"
          eyebrow="Take the tour"
          title="See Unitus in action"
          description="Real screens from the app, on laptop, tablet and phone."
        />

        <div
          className="mt-12 flex flex-col gap-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div role="tablist" aria-label="Product tour" className="reveal mx-auto grid w-full max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
            {STEPS.map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.id}
                  role="tab"
                  id={`tour-tab-${s.id}`}
                  aria-selected={active}
                  aria-controls="tour-panel"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active ? "border-primary/40 bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
                  {active && (
                    <span
                      key={index}
                      data-paused={paused}
                      className="tour-progress absolute bottom-0 left-0 h-0.5 bg-primary"
                      style={{ "--tour-duration": `${DURATION}s` } as React.CSSProperties}
                      onAnimationEnd={() => setIndex((i) => (i + 1) % STEPS.length)}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${step.id}`} className="flex flex-col gap-8">
            <div key={step.id} className="mx-auto flex max-w-xl flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
              <h3 className="font-heading text-2xl font-semibold tracking-tight">{step.title}</h3>
              <p className="text-muted-foreground">{step.body}</p>
            </div>

            <div key={`${step.id}-devices`} className="relative mx-auto w-full max-w-5xl animate-in fade-in zoom-in-95 duration-700 sm:pr-24 lg:pr-36">
              <BrowserFrame url={step.url} className="hidden sm:block">
                <Screen name={step.screen} device="desktop" alt={`${step.label} on a laptop`} duration={DURATION * 1.6} />
              </BrowserFrame>
              <Second
                className={cn(
                  "mx-auto sm:absolute sm:right-0 sm:-bottom-8",
                  step.second === "phone" ? "w-56 sm:w-44 lg:w-56" : "w-72 sm:w-56 lg:w-72",
                )}
              >
                <Screen name={step.screen} device={step.second} alt={`${step.label} on a ${step.second}`} duration={DURATION * 2} />
              </Second>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
