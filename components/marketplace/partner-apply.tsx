"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OfferCategory } from "@/lib/marketplace";

const CATEGORIES: OfferCategory[] = ["Electronics", "Vehicles", "Home", "Phones", "Farming", "Education"];

export const selectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function PartnerApply() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    // TODO(backend): create the merchant account, start PayPal partner onboarding and queue verification.
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/business/dashboard");
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Become a partner</CardTitle>
        <CardDescription className="text-base">We verify every business before its offers go live.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="biz-name">Business name</FieldLabel>
              <Input id="biz-name" required className="h-11" autoComplete="organization" />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="biz-category">What you sell</FieldLabel>
                <select id="biz-category" className={selectClass} defaultValue="Electronics">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="biz-country">Country</FieldLabel>
                <Input id="biz-country" required className="h-11" placeholder="Kenya" autoComplete="country-name" />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="biz-site">Website or shop link (optional)</FieldLabel>
              <Input id="biz-site" type="url" className="h-11" placeholder="https://" />
            </Field>
            <Field>
              <FieldLabel htmlFor="biz-paypal">PayPal business email</FieldLabel>
              <Input id="biz-paypal" type="email" required className="h-11" />
              <FieldDescription>Members pay you here directly. Unitus never holds your money.</FieldDescription>
            </Field>
            <Field orientation="horizontal" className="rounded-2xl border p-4">
              <Checkbox id="biz-terms" required />
              <FieldContent>
                <FieldLabel htmlFor="biz-terms">I agree to the partner terms</FieldLabel>
                <FieldDescription>
                  Honest member prices, delivery as described, and no contacting members outside Unitus. 3% referral fee per sale.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Button type="submit" size="lg" className="h-11" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              Apply as a partner
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
