"use client";

import { useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { BadgeCheckIcon, EyeIcon, PackageIcon, PlusIcon, ShoppingBagIcon, WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid } from "@/components/dashboard/data-grid";
import { money } from "@/lib/chama";
import { discountPercent, merchantRevenue, REFERRAL_FEE, type Offer, type OfferCategory } from "@/lib/marketplace";
import { DEMAND, DEMO_MERCHANT_ID, MERCHANTS, OFFERS } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "./category-icon";
import { selectClass } from "./partner-apply";

const CATEGORIES: OfferCategory[] = ["Electronics", "Vehicles", "Home", "Phones", "Farming", "Education"];

const columns: ColDef<Offer>[] = [
  {
    field: "title",
    headerName: "Offer",
    flex: 2,
    minWidth: 240,
    cellRenderer: (p: ICellRendererParams<Offer>) => (
      <span className="flex items-center gap-2 font-medium">
        {p.data && <CategoryIcon category={p.data.category} className="size-4 text-muted-foreground" />}
        {p.value}
      </span>
    ),
  },
  { field: "price", headerName: "Member price", type: "rightAligned", valueFormatter: (p) => money(p.value), maxWidth: 150 },
  { headerName: "Discount", type: "rightAligned", valueGetter: (p) => (p.data ? discountPercent(p.data) : 0), valueFormatter: (p) => `${p.value}%`, maxWidth: 120 },
  {
    headerName: "Instalments",
    valueGetter: (p) => (p.data?.instalments ? `${money(p.data.instalments.deposit)} + ${p.data.instalments.months} × ${money(p.data.instalments.monthly)}` : "—"),
    minWidth: 190,
  },
  { field: "views", headerName: "Views", type: "rightAligned", valueFormatter: (p) => p.value.toLocaleString(), maxWidth: 110 },
  { field: "sales", headerName: "Sales", type: "rightAligned", maxWidth: 100 },
  {
    headerName: "Conversion",
    type: "rightAligned",
    valueGetter: (p) => (p.data && p.data.views ? (p.data.sales / p.data.views) * 100 : 0),
    valueFormatter: (p) => `${p.value.toFixed(1)}%`,
    maxWidth: 130,
  },
  {
    field: "status",
    headerName: "Status",
    maxWidth: 120,
    cellRenderer: (p: ICellRendererParams) => (
      <Badge className={cn("border-0", p.value === "Live" ? "bg-secondary text-primary" : "bg-muted text-muted-foreground")}>{p.value}</Badge>
    ),
  },
];

function NewOffer({ onCreate }: { onCreate: (o: Offer) => void }) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(0);
  const [listPrice, setListPrice] = useState(0);
  const [withPlan, setWithPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (price <= 0 || listPrice < price) {
      setError("The member price must be above zero and no higher than the normal price.");
      return;
    }
    const deposit = Number(f.get("deposit"));
    const months = Number(f.get("months"));
    if (withPlan && (deposit <= 0 || deposit >= price || months < 1)) {
      setError("The deposit must be less than the price, with at least 1 monthly payment.");
      return;
    }
    // TODO(backend): save the offer as Draft and submit it for review.
    onCreate({
      id: `o_${Date.now()}`,
      merchantId: DEMO_MERCHANT_ID,
      title: String(f.get("title")),
      description: String(f.get("description")),
      category: f.get("category") as OfferCategory,
      price,
      listPrice,
      instalments: withPlan ? { deposit, months, monthly: Math.ceil((price - deposit) / months) } : undefined,
      shipsTo: String(f.get("shipsTo"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      stock: Number(f.get("stock")),
      views: 0,
      sales: 0,
      status: "Draft",
    });
    setError(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="h-10 px-4" />}>
        <PlusIcon data-icon="inline-start" /> New offer
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">New member offer</DialogTitle>
          <DialogDescription>Offers are reviewed before they go live. Price it for a payout: most winners receive $500–$1,000.</DialogDescription>
        </DialogHeader>
        <form id="new-offer" onSubmit={submit}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="offer-title">Product</FieldLabel>
              <Input id="offer-title" name="title" required className="h-10" placeholder='e.g. 55" 4K smart TV' />
            </Field>
            <Field>
              <FieldLabel htmlFor="offer-desc">What&apos;s included</FieldLabel>
              <Textarea id="offer-desc" name="description" required placeholder="Delivery, warranty, installation…" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="offer-cat">Category</FieldLabel>
                <select id="offer-cat" name="category" className={cn(selectClass, "h-10")} defaultValue="Electronics">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-stock">Stock</FieldLabel>
                <Input id="offer-stock" name="stock" type="number" min={1} defaultValue={10} required className="h-10" />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-list">Normal price ($)</FieldLabel>
                <Input id="offer-list" type="number" min={1} required className="h-10" onChange={(e) => setListPrice(Number(e.target.value))} />
              </Field>
              <Field>
                <FieldLabel htmlFor="offer-price">Member price ($)</FieldLabel>
                <Input id="offer-price" type="number" min={1} required className="h-10" onChange={(e) => setPrice(Number(e.target.value))} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="offer-ships">Delivers to</FieldLabel>
              <Input id="offer-ships" name="shipsTo" defaultValue="Kenya, Uganda, Tanzania" className="h-10" />
              <FieldDescription>Separate countries with commas.</FieldDescription>
            </Field>
            <Field orientation="horizontal" className="justify-between rounded-2xl border p-3">
              <FieldLabel htmlFor="offer-plan">Offer instalments (payout as deposit)</FieldLabel>
              <Switch id="offer-plan" checked={withPlan} onCheckedChange={setWithPlan} />
            </Field>
            {withPlan && (
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="offer-deposit">Deposit ($)</FieldLabel>
                  <Input id="offer-deposit" name="deposit" type="number" min={1} defaultValue={1000} className="h-10" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="offer-months">Monthly payments</FieldLabel>
                  <Input id="offer-months" name="months" type="number" min={1} max={36} defaultValue={12} className="h-10" />
                </Field>
              </div>
            )}
            {price > 0 && (
              <p className="rounded-xl bg-secondary/60 p-3 text-sm">
                You receive <span className="font-semibold">{money(price * (1 - REFERRAL_FEE))}</span> per sale after the{" "}
                {REFERRAL_FEE * 100}% Unitus fee.
              </p>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="new-offer">
            Submit for review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MerchantDashboard() {
  const merchant = MERCHANTS.find((m) => m.id === DEMO_MERCHANT_ID)!;
  const [offers, setOffers] = useState(() => OFFERS.filter((o) => o.merchantId === DEMO_MERCHANT_ID));
  const live = offers.filter((o) => o.status === "Live");
  const revenue = merchantRevenue(offers);
  const views = offers.reduce((s, o) => s + o.views, 0);
  const sales = offers.reduce((s, o) => s + o.sales, 0);
  const maxBand = Math.max(...DEMAND.payoutBands.map((b) => b.winners));

  const stats = [
    { icon: PackageIcon, label: "Live offers", value: String(live.length) },
    { icon: EyeIcon, label: "Views this month", value: views.toLocaleString() },
    { icon: ShoppingBagIcon, label: "Sales", value: sales.toLocaleString() },
    { icon: WalletIcon, label: "Your earnings", value: money(Math.round(revenue.net)), note: `after ${money(Math.round(revenue.fee))} Unitus fee` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Partner dashboard {merchant.verified && <BadgeCheckIcon className="size-4 text-primary" aria-label="Verified" />}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{merchant.name}</h1>
        </div>
        <NewOffer onCreate={(o) => setOffers((list) => [o, ...list])} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-3 rounded-3xl">
            <CardHeader className="flex flex-row items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <s.icon className="size-5" />
              </div>
              <CardDescription className="text-sm font-medium">{s.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-semibold tracking-tight">{s.value}</p>
              {s.note && <p className="text-sm text-muted-foreground">{s.note}</p>}
            </CardContent>
          </Card>
        ))}
      </section>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">Your offers</CardTitle>
            <CardDescription>New offers start as drafts and go live after review.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataGrid<Offer> rowData={offers} columnDefs={columns} getRowId={(p) => p.data.id} />
          </CardContent>
        </Card>
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="font-heading text-xl">This month&apos;s winners</CardTitle>
            <CardDescription>
              {DEMAND.winnersThisMonth.toLocaleString()} members received {money(DEMAND.totalPayoutsThisMonth)}. Totals only; you never see
              who they are.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {DEMAND.payoutBands.map((b) => (
                <li key={b.band} className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span>{b.band}</span>
                    <span className="text-muted-foreground tabular-nums">{b.winners.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(b.winners / maxBand) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

    </main>
  );
}
