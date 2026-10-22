"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  BanIcon,
  Loader2Icon,
  LockIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ShareInvite } from "./share-invite";
import { AUTOMATIC_PAYOUTS, money, validateRules, type GroupRules } from "@/lib/chama";
import { FREQUENCIES, formatDue, perRound, type Frequency } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** `startsAt` is an ISO timestamp; the input shows it in the browser's time zone. */
type FormState = GroupRules & { startsAt: string; description: string };
type FieldKey = keyof FormState;

const STEPS: { title: string; fields: FieldKey[] }[] = [
  { title: "Basics", fields: ["name", "memberCount", "frequency", "startsAt"] },
  { title: "Money per round", fields: ["monthlyContribution", "monthlySavings", "joiningFee"] },
  { title: "Savings & loans", fields: ["shareOut", "loanMultiplier", "loanInterestRate"] },
  { title: "The money", fields: [] },
  { title: "Review & lock", fields: [] },
];

const INITIAL: FormState = {
  name: "",
  description: "",
  memberCount: 10,
  frequency: "monthly",
  startsAt: "",
  currency: "USD",
  monthlyContribution: 100,
  monthlySavings: 50,
  joiningFee: 100,
  shareOut: "year-end",
  loanMultiplier: 3,
  loanInterestRate: 5,
};


/** ISO → the "YYYY-MM-DDTHH:mm" a datetime-local input wants, in local time. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const when = (f: FormState) => (f.startsAt ? formatDue(f.startsAt, f.frequency) : "—");

function MoneyInput({
  id,
  value,
  onChange,
  suffix,
  prefix = "$",
  invalid,
  min = 0,
  max,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  prefix?: string | null;
  invalid?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">{prefix}</span>}
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        aria-invalid={invalid}
        className={cn("h-11", prefix && "pl-7", suffix && "pr-16")}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{suffix}</span>}
    </div>
  );
}

function Choice<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", options.length > 2 ? "grid-cols-5" : "grid-cols-2", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex flex-col items-start rounded-xl border px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            value === o.value ? "border-primary bg-secondary text-foreground ring-1 ring-primary" : "hover:bg-muted",
          )}
        >
          <span className="font-semibold">{o.label}</span>
          {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Preview({ f }: { f: FormState }) {
  const ok = (n: number) => (Number.isFinite(n) ? n : 0);
  // A full chama: each round everyone pays in, the recipient too, and the recipient gets it all.
  const payout = ok(f.memberCount) * ok(f.monthlyContribution);
  const perMember = ok(f.monthlyContribution) + ok(f.monthlySavings);
  const savingsCycle = ok(f.memberCount) * ok(f.memberCount) * ok(f.monthlySavings);
  const exampleLoan = (ok(f.joiningFee) + ok(f.monthlySavings) * 6) * ok(f.loanMultiplier);
  const per = perRound(f.frequency);
  return (
    <Card className="gap-4 rounded-3xl bg-band text-band-foreground lg:sticky lg:top-24">
      <CardHeader>
        <CardDescription className="text-band-foreground/70">At a glance</CardDescription>
        <CardTitle className="font-heading text-2xl">{f.name.trim() || "Your chama"}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="rounded-2xl bg-band-foreground/10 p-4">
          <p className="text-band-foreground/70">Each round ({FREQUENCIES[f.frequency].label.toLowerCase()}) one member receives</p>
          <p className="font-heading text-3xl font-semibold">{money(payout)}</p>
          <p className="text-xs text-band-foreground/70">when all {ok(f.memberCount)} places are filled; less while it&apos;s filling up</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-band-foreground/70">Each member pays</dt>
            <dd className="font-semibold">
              {money(perMember)} / {per}
            </dd>
            <dd className="text-xs text-band-foreground/70">plus PayPal&apos;s fee, paid by the member</dd>
          </div>
          <div>
            <dt className="text-band-foreground/70">First round</dt>
            <dd className="font-semibold">{when(f)}</dd>
            <dd className="text-xs text-band-foreground/70">once 2 members have paid</dd>
          </div>
          <div>
            <dt className="text-band-foreground/70">Savings pool / cycle</dt>
            <dd className="font-semibold">{money(savingsCycle)}</dd>
          </div>
          <div>
            <dt className="text-band-foreground/70">Loan after 6 rounds</dt>
            <dd className="font-semibold">up to {money(exampleLoan)}</dd>
          </div>
        </dl>
        <Separator className="bg-band-foreground/15" />
        <p className="flex items-start gap-2 text-band-foreground/80">
          <LockIcon className="mt-0.5 size-4 shrink-0" />
          These rules lock when you create the chama. They can&apos;t be edited afterwards.
        </p>
      </CardContent>
    </Card>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** `defaultStartsAt` (ISO) comes from the server so the default is always just ahead of now. */
export function CreateChamaFlow({ defaultStartsAt, allowTestFrequency }: { defaultStartsAt: string; allowTestFrequency: boolean }) {
  const [f, setF] = useState<FormState>(() => ({ ...INITIAL, startsAt: defaultStartsAt }));
  const frequencies = (Object.keys(FREQUENCIES) as Frequency[]).filter((k) => allowTestFrequency || !FREQUENCIES[k].testOnly);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState({ locked: false, noWithdraw: false, deletion: false });
  const [created, setCreated] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const set = <K extends FieldKey>(k: K, v: FormState[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const errors = validateRules(f, { allowTestFrequency });
  const stepErrors = STEPS[step].fields.filter((k) => k in errors);
  const err = (k: FieldKey) => (showErrors ? (errors as Record<string, string | undefined>)[k] : undefined);
  const allAcked = ack.locked && ack.noWithdraw && ack.deletion;

  function next() {
    if (stepErrors.length) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => s + 1);
  }

  async function create() {
    setBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/chamas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't create the chama. Please try again.");
      setCreated(data.inviteCode);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <Card className="mx-auto w-full max-w-xl rounded-3xl text-center">
        <CardHeader className="items-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <BadgeCheckIcon className="size-7" />
          </div>
          <CardTitle className="mt-2 font-heading text-2xl">{f.name} is live</CardTitle>
          <CardDescription className="text-base">
            The rules are locked. Share this invite code with up to {f.memberCount} members. The first round runs {when(f)} once 2
            members have paid the joining fee; others can join while it runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ShareInvite code={created} chamaName={f.name} />
          <p className="max-w-sm text-sm text-muted-foreground">
            Each member logs in with their personal PayPal and pays the {money(f.joiningFee)} joining fee.
          </p>
          <Alert className="max-w-md text-left">
            <LockIcon />
            <AlertTitle>Chama account UNT-{created} is open</AlertTitle>
            <AlertDescription>
              Unitus holds the chama&apos;s money in its own PayPal account, recorded under this chama account. You manage the chama;
              only Unitus&apos;s automatic rounds move its money. Want to take part too? Join as a member and pay the joining fee.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex-wrap justify-center gap-2">
          <Link href={`/onboarding?code=${created}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
            Join as a member too
          </Link>
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Go to dashboard
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <ol className="flex gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-1 flex-col gap-2" aria-current={i === step ? "step" : undefined}>
              <div className={cn("h-1.5 rounded-full bg-muted", i <= step && "bg-primary", i === step && "bg-primary/60")} />
              <span className={cn("hidden text-xs font-medium md:block", i === step ? "text-foreground" : "text-muted-foreground")}>{s.title}</span>
            </li>
          ))}
        </ol>

        <Card className="rounded-3xl">
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Start a chama</CardTitle>
                <CardDescription className="text-base">Name your group, how often it runs and how many members it can take.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-5">
                  <Field data-invalid={!!err("name")}>
                    <FieldLabel htmlFor="name">Chama name</FieldLabel>
                    <Input id="name" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Umoja Diaspora Chama" className="h-11" aria-invalid={!!err("name")} />
                    <FieldError>{err("name")}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="description">What is it for? (optional)</FieldLabel>
                    <Textarea id="description" value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Family savings, building a home back home, school fees…" />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!err("memberCount")}>
                      <FieldLabel htmlFor="memberCount">Maximum members</FieldLabel>
                      <MoneyInput id="memberCount" prefix={null} min={2} max={30} value={f.memberCount} onChange={(v) => set("memberCount", v)} suffix="people" invalid={!!err("memberCount")} />
                      <FieldDescription>It can start with 2; others join while it runs.</FieldDescription>
                      <FieldError>{err("memberCount")}</FieldError>
                    </Field>
                    <Field data-invalid={!!err("startsAt")}>
                      <FieldLabel htmlFor="startsAt">First round</FieldLabel>
                      <Input
                        id="startsAt"
                        type="datetime-local"
                        value={toLocalInput(f.startsAt)}
                        onChange={(e) => set("startsAt", e.target.value ? new Date(e.target.value).toISOString() : "")}
                        className="h-11"
                        aria-invalid={!!err("startsAt")}
                        // Server and browser may format local time differently on first render.
                        suppressHydrationWarning
                      />
                      <FieldDescription>Runs once at least 2 members have paid the joining fee.</FieldDescription>
                      <FieldError>{err("startsAt")}</FieldError>
                    </Field>
                  </div>
                  <Field data-invalid={!!err("frequency")}>
                    <FieldLabel>How often</FieldLabel>
                    <Choice
                      label="How often"
                      value={f.frequency}
                      onChange={(v) => set("frequency", v)}
                      className="grid-cols-2 sm:grid-cols-3"
                      options={frequencies.map((k) => ({ value: k, label: FREQUENCIES[k].label, hint: FREQUENCIES[k].testOnly ? "Sandbox testing" : undefined }))}
                    />
                    <FieldDescription>Each round, one member receives the pot and everyone&apos;s savings are collected.</FieldDescription>
                    <FieldError>{err("frequency")}</FieldError>
                  </Field>
                </FieldGroup>
              </CardContent>
            </>
          )}

          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Money per round</CardTitle>
                <CardDescription className="text-base">
                  What each member pays every round ({FREQUENCIES[f.frequency].label.toLowerCase()}), and the one-time joining fee.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={!!err("monthlyContribution")}>
                      <FieldLabel htmlFor="contribution">Merry-go-round contribution</FieldLabel>
                      <MoneyInput id="contribution" value={f.monthlyContribution} onChange={(v) => set("monthlyContribution", v)} suffix={`/ ${perRound(f.frequency)}`} invalid={!!err("monthlyContribution")} />
                      <FieldDescription>All of it goes to that round&apos;s recipient.</FieldDescription>
                      <FieldError>{err("monthlyContribution")}</FieldError>
                    </Field>
                    <Field data-invalid={!!err("monthlySavings")}>
                      <FieldLabel htmlFor="savings">Savings</FieldLabel>
                      <MoneyInput id="savings" value={f.monthlySavings} onChange={(v) => set("monthlySavings", v)} suffix={`/ ${perRound(f.frequency)}`} invalid={!!err("monthlySavings")} />
                      <FieldDescription>Kept in each member&apos;s savings until share-out.</FieldDescription>
                      <FieldError>{err("monthlySavings")}</FieldError>
                    </Field>
                    <Field data-invalid={!!err("joiningFee")}>
                      <FieldLabel htmlFor="joiningFee">Joining fee</FieldLabel>
                      <MoneyInput id="joiningFee" value={f.joiningFee} onChange={(v) => set("joiningFee", v)} invalid={!!err("joiningFee")} />
                      <FieldDescription>Verifies PayPal. Locked in the member&apos;s savings until they leave.</FieldDescription>
                      <FieldError>{err("joiningFee")}</FieldError>
                    </Field>
                  </div>
                </FieldGroup>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Savings & loans</CardTitle>
                <CardDescription className="text-base">When savings come back to members, and how members can borrow from the pool.</CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-6">
                  <Field>
                    <FieldLabel>Savings share-out</FieldLabel>
                    <Choice
                      label="Savings share-out"
                      value={f.shareOut}
                      onChange={(v) => set("shareOut", v)}
                      options={[
                        { value: "mid-year", label: "Mid-year", hint: "Paid out every June" },
                        { value: "year-end", label: "Year end", hint: "Paid out every December" },
                      ]}
                    />
                    <FieldDescription>Joining fees stay locked through share-outs. They&apos;re only returned when a member leaves.</FieldDescription>
                  </Field>
                  <Field data-invalid={!!err("loanMultiplier")}>
                    <FieldLabel>Loan limit</FieldLabel>
                    <Choice
                      label="Loan multiplier"
                      value={f.loanMultiplier}
                      onChange={(v) => set("loanMultiplier", v)}
                      options={[1, 2, 3, 4, 5].map((m) => ({ value: m, label: `${m}×`, hint: "savings" }))}
                    />
                    <FieldDescription>A member can borrow up to this many times their savings.</FieldDescription>
                  </Field>
                  <Field data-invalid={!!err("loanInterestRate")} className="sm:max-w-xs">
                    <FieldLabel htmlFor="rate">Loan interest (flat)</FieldLabel>
                    <MoneyInput id="rate" prefix={null} max={30} value={f.loanInterestRate} onChange={(v) => set("loanInterestRate", v)} suffix="%" invalid={!!err("loanInterestRate")} />
                    <FieldDescription>Interest goes back into the savings pool.</FieldDescription>
                    <FieldError>{err("loanInterestRate")}</FieldError>
                  </Field>
                </FieldGroup>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Where the money goes</CardTitle>
                <CardDescription className="text-base">
                  Members pay through PayPal. Every dollar is recorded against this chama, and Unitus pays out automatically under your
                  rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <Alert>
                  <BanIcon />
                  <AlertTitle>Nobody can withdraw the chama&apos;s money</AlertTitle>
                  <AlertDescription>
                    Not you, not admins, not members. Money only leaves the chama through these automatic payouts:
                    <ul className="mt-2 list-disc pl-5">
                      {AUTOMATIC_PAYOUTS.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </>
          )}

          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle className="font-heading text-2xl">Review and lock the rules</CardTitle>
                <CardDescription className="text-base">Check everything carefully. Once the chama is created, none of this can change.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="divide-y rounded-2xl border px-4">
                  <ReviewRow label="Name" value={f.name} />
                  <ReviewRow label="Members" value={`Up to ${f.memberCount} · starts with 2`} />
                  <ReviewRow label="Rounds" value={`${FREQUENCIES[f.frequency].label} · first ${when(f)}`} />
                  <ReviewRow
                    label="Contribution"
                    value={`${money(f.monthlyContribution)} / ${perRound(f.frequency)} → up to ${money(f.monthlyContribution * (f.memberCount - 1))} payout`}
                  />
                  <ReviewRow label="Savings" value={`${money(f.monthlySavings)} / ${perRound(f.frequency)}`} />
                  <ReviewRow label="Joining fee" value={`${money(f.joiningFee)}, locked until a member leaves`} />
                  <ReviewRow label="Auto-deduction" value="Every round, from each member's saved PayPal" />
                  <ReviewRow label="Share-out" value={f.shareOut === "year-end" ? "Year end" : "Mid-year"} />
                  <ReviewRow label="Loans" value={`Up to ${f.loanMultiplier}× savings at ${f.loanInterestRate}% flat`} />
                  <ReviewRow label="Payments" value="Through PayPal · withdrawals disabled" />
                </div>

                <div className="flex flex-col gap-3">
                  {[
                    {
                      key: "locked" as const,
                      icon: LockIcon,
                      title: "I understand these rules can't be edited after the chama is created",
                      body: "To change them, members would need to close this chama and start a new one.",
                    },
                    {
                      key: "noWithdraw" as const,
                      icon: BanIcon,
                      title: "I understand nobody can withdraw money from the chama account",
                      body: "Payouts, share-outs, loans and exits all happen automatically under these rules.",
                    },
                    {
                      key: "deletion" as const,
                      icon: Trash2Icon,
                      title: "I understand the chama can only be deleted once it's clean for everyone",
                      body: "Every member must have received their payout, all savings must be shared out, and no loans can be outstanding.",
                    },
                  ].map((a) => (
                    <Field key={a.key} orientation="horizontal" className="rounded-2xl border p-4">
                      <Checkbox id={`ack-${a.key}`} checked={ack[a.key]} onCheckedChange={(v) => setAck((s) => ({ ...s, [a.key]: v === true }))} />
                      <FieldContent>
                        <FieldLabel htmlFor={`ack-${a.key}`} className="flex items-center gap-2">
                          <a.icon className="size-4 text-primary" /> {a.title}
                        </FieldLabel>
                        <FieldDescription>{a.body}</FieldDescription>
                      </FieldContent>
                    </Field>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {createError && (
            <div className="px-6">
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            </div>
          )}
          <CardFooter className="justify-between">
            {step > 0 ? (
              <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)} disabled={busy}>
                <ArrowLeftIcon data-icon="inline-start" /> Back
              </Button>
            ) : (
              <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                Cancel
              </Link>
            )}
            {step < 3 && (
              <Button size="lg" onClick={next}>
                Continue <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
            {step === 3 && (
              <Button size="lg" onClick={next}>
                Review <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
            {step === 4 && (
              <Button size="lg" onClick={create} disabled={!allAcked || busy || Object.keys(errors).length > 0}>
                {busy ? <Loader2Icon className="animate-spin" /> : <ShieldCheckIcon data-icon="inline-start" />}
                Create and lock chama
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      <aside className="order-first lg:order-none">
        <Preview f={f} />
      </aside>
    </div>
  );
}
