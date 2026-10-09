import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Person, SKIN } from "@/components/illustrations/person";
import { Logo } from "./logo";

export function Cta() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-accent px-6 py-16 text-accent-foreground sm:px-14">
        <svg viewBox="0 0 360 200" aria-hidden className="pointer-events-none absolute right-6 -bottom-4 hidden w-[340px] lg:block">
          <Person id="cta-1" x={80} y={120} r={46} skin={SKIN[2]} shirt="var(--primary)" style="afro" />
          <Person id="cta-2" x={180} y={90} r={52} skin={SKIN[1]} shirt="var(--clay)" style="wrap" hair="var(--primary)" />
          <Person id="cta-3" x={285} y={125} r={46} skin={SKIN[3]} shirt="var(--sky)" style="bun" />
        </svg>
        <div className="relative max-w-xl">
          <h2 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Bring your people together and start your chama today.
          </h2>
          <p className="mt-4 text-lg opacity-80">
            Set the rules, connect PayPal and invite members. It takes about five minutes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/groups/new"
              className={cn(buttonVariants({ size: "lg" }), "h-12 bg-foreground px-6 text-base text-background hover:bg-foreground/85")}
            >
              Create a group
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 border-accent-foreground/30 bg-transparent px-6 text-base hover:bg-accent-foreground/10")}
            >
              I have an invite code
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const FOOTER_LINKS = {
  Product: [
    ["How it works", "#how-it-works"],
    ["Tour", "#tour"],
    ["Offers", "#offers"],
    ["Loans", "#loans"],
    ["FAQ", "#faq"],
  ],
  Company: [
    ["The idea", "#idea"],
    ["For business", "/business"],
    ["About", "/about"],
    ["Contact", "/contact"],
  ],
  Legal: [
    ["Terms", "/terms"],
    ["Privacy", "/privacy"],
  ],
};

export function Footer() {
  return (
    <footer className="border-t bg-secondary/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Merry-go-round, savings and loans for chamas whose members live far apart.
          </p>
        </div>
        {Object.entries(FOOTER_LINKS).map(([group, links]) => (
          <div key={group} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{group}</h3>
            {links.map(([label, href]) => (
              <Link key={label} href={href} className="text-sm text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <Separator />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>© 2026 Unitus. Built for the hackathon.</p>
        <p>Payments are processed by PayPal. Unitus does not hold member funds.</p>
      </div>
    </footer>
  );
}
