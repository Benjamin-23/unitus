// Partner marketplace: businesses list offers sized to chama payouts, and
// members spend their merry-go-round payout (already in their own PayPal) on them.
// Money never moves from the chama account to a business.

export type OfferCategory = "Electronics" | "Vehicles" | "Home" | "Phones" | "Education" | "Farming";

export type Merchant = {
  id: string;
  name: string;
  category: OfferCategory;
  country: string;
  verified: boolean;
};

export type Offer = {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  category: OfferCategory;
  price: number;
  /** Price before the member discount, to show the saving. */
  listPrice: number;
  /** Merchant-provided instalments for items bigger than a payout. */
  instalments?: { deposit: number; months: number; monthly: number };
  shipsTo: string[];
  stock: number;
  views: number;
  sales: number;
  status: "Live" | "Paused" | "Draft";
};

/** Unitus' referral fee on each sale, taken from the merchant's side. */
export const REFERRAL_FEE = 0.03;

export type Affordability =
  | { kind: "covered"; leftOver: number }
  | { kind: "deposit"; deposit: number; monthly: number; months: number }
  | { kind: "out-of-reach"; shortBy: number };

/** How an offer fits a member's payout. */
export function affordability(offer: Offer, payout: number): Affordability {
  if (offer.price <= payout) return { kind: "covered", leftOver: payout - offer.price };
  if (offer.instalments && offer.instalments.deposit <= payout) {
    return { kind: "deposit", ...offer.instalments };
  }
  return { kind: "out-of-reach", shortBy: offer.price - payout };
}

export function discountPercent(o: Offer) {
  return Math.round((1 - o.price / o.listPrice) * 100);
}

/** Best fits first: covered (closest to the payout), then deposit offers, then the rest. */
export function rankForPayout(offers: Offer[], payout: number) {
  const rank = (o: Offer) => {
    const a = affordability(o, payout);
    return a.kind === "covered" ? 0 : a.kind === "deposit" ? 1 : 2;
  };
  return [...offers].sort((a, b) => rank(a) - rank(b) || Math.abs(payout - a.price) - Math.abs(payout - b.price));
}

export function merchantRevenue(offers: Offer[]) {
  const gross = offers.reduce((s, o) => s + o.sales * (o.instalments ? o.instalments.deposit : o.price), 0);
  return { gross, fee: gross * REFERRAL_FEE, net: gross * (1 - REFERRAL_FEE) };
}
