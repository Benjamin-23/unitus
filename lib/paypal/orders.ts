// Builds PayPal orders from server-side data. Amounts never come from the
// browser: the client only says *what* it's paying for.
import { affordability } from "@/lib/marketplace";
import { MERCHANTS, OFFERS } from "@/lib/marketplace-data";
import { withFee } from "@/lib/fees";
import { paypalRequest, PayPalError } from "./server";

export type OrderPurpose = { purpose: "joining-fee"; chamaId: string } | { purpose: "offer"; offerId: string };

type Order = {
  id: string;
  status: string;
  payer?: { payer_id?: string; address?: { country_code?: string } };
  payment_source?: {
    paypal?: {
      email_address?: string;
      attributes?: { vault?: { id?: string; status?: string; customer?: { id?: string } } };
    };
  };
  purchase_units?: {
    reference_id?: string;
    amount?: { value: string; currency_code: string };
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
        seller_receivable_breakdown?: { paypal_fee?: { value: string }; net_amount?: { value: string } };
      }[];
    };
  }[];
};

const usd = (n: number) => ({ currency_code: "USD", value: n.toFixed(2) });

/** PayPal's actual fee and the net that reached the pool, from a capture. */
function captureFigures(order: Order) {
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  const breakdown = capture?.seller_receivable_breakdown;
  return {
    captureId: capture?.id,
    amount: capture?.amount.value,
    paypalFee: breakdown?.paypal_fee ? Number(breakdown.paypal_fee.value) : undefined,
    netAmount: breakdown?.net_amount ? Number(breakdown.net_amount.value) : undefined,
  };
}

/** A purchase unit for chama money: the chama's amount plus the PayPal fee the member covers. */
function chamaUnit(referenceId: string, customId: string, description: string, lines: { name: string; amount: number }[]) {
  const principal = lines.reduce((sum, l) => sum + l.amount, 0);
  const charge = withFee(principal);
  const items = [...lines, { name: "PayPal processing fee", amount: charge.fee }].filter((l) => l.amount > 0);
  return {
    charge,
    unit: {
      reference_id: referenceId,
      custom_id: customId,
      description,
      amount: { ...usd(charge.total), breakdown: { item_total: usd(charge.total) } },
      items: items.map((l) => ({ name: l.name, quantity: "1", category: "DIGITAL_GOODS", unit_amount: usd(l.amount) })),
    },
  };
}

function unit(referenceId: string, name: string, description: string, amount: number, category: "DIGITAL_GOODS" | "PHYSICAL_GOODS") {
  return {
    reference_id: referenceId,
    description,
    custom_id: referenceId,
    amount: { ...usd(amount), breakdown: { item_total: usd(amount) } },
    items: [{ name, quantity: "1", category, unit_amount: usd(amount) }],
  };
}

/** Creates the order for a one-off payment and returns its id for the v6 SDK. */
export async function createOrder(
  request: OrderPurpose,
  origin: string,
  { chama, payout = 0 }: { chama?: { id: string; name: string; joiningFee: number }; payout?: number } = {},
) {
  const returnUrl = `${origin}/paypal/return`;
  const experience = { brand_name: "Unitus", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", return_url: returnUrl, cancel_url: returnUrl };

  if (request.purpose === "joining-fee") {
    if (!chama) throw new PayPalError("Chama not found.", 404);
    // Paying the joining fee also saves the member's PayPal (vault) so the
    // monthly contribution can be collected automatically afterwards.
    const { unit: purchaseUnit, charge } = chamaUnit("joining-fee", `${chama.id}:joining-fee`, `${chama.name} joining fee (kept in your savings)`, [
      { name: "Joining fee", amount: chama.joiningFee },
    ]);
    const order = await paypalRequest<Order>("/v2/checkout/orders", {
      body: {
        intent: "CAPTURE",
        purchase_units: [purchaseUnit],
        payment_source: {
          paypal: {
            attributes: { vault: { store_in_vault: "ON_SUCCESS", usage_type: "MERCHANT", customer_type: "CONSUMER" } },
            experience_context: experience,
          },
        },
      },
    });
    return { order, charge };
  }

  const offer = OFFERS.find((o) => o.id === request.offerId && o.status === "Live");
  if (!offer) throw new PayPalError("That offer isn't available any more.", 404);
  const merchant = MERCHANTS.find((m) => m.id === offer.merchantId)!;
  // Same rule as the offer card: items sold on instalments take the deposit now.
  const plan = affordability(offer, payout).kind !== "covered" ? offer.instalments : undefined;
  const amount = plan ? plan.deposit : offer.price;

  // Sandbox demo: send the money straight to a test business account if one is
  // configured. A real marketplace needs PayPal's multiparty (platform) setup
  // so the referral fee is split automatically.
  const payeeEmail = process.env.PAYPAL_DEMO_MERCHANT_EMAIL;

  // Offer purchases pay the business, not the chama: no Unitus fee is added.
  const order = await paypalRequest<Order>("/v2/checkout/orders", {
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          ...unit(offer.id, offer.title, `${plan ? "Deposit for " : ""}${offer.title} from ${merchant.name}`, amount, "PHYSICAL_GOODS"),
          ...(payeeEmail ? { payee: { email_address: payeeEmail } } : {}),
        },
      ],
      payment_source: { paypal: { experience_context: experience } },
    },
  });
  return { order, charge: undefined };
}

export async function captureOrder(orderId: string) {
  const order = await paypalRequest<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`);
  return {
    status: order.status,
    ...captureFigures(order),
    payerEmail: order.payment_source?.paypal?.email_address,
    payerCountry: order.payer?.address?.country_code,
    payerId: order.payer?.payer_id,
    vaultId: order.payment_source?.paypal?.attributes?.vault?.id,
    paypalCustomerId: order.payment_source?.paypal?.attributes?.vault?.customer?.id,
  };
}

/**
 * Charges a member's share of one round to their saved PayPal: the
 * contribution (to that round's recipient) and/or savings, plus the PayPal fee.
 * No buyer approval: the member agreed when they saved their PayPal.
 *
 * The PayPal-Request-Id is fixed per round and member, so a scheduler re-run or
 * network retry is the same payment to PayPal and can never charge twice.
 */
// TODO(backend): add loan instalments once loans are stored in the database.
export async function chargeRoundDeduction(
  vaultId: string,
  chama: { id: string; name: string },
  { memberId, roundId, label, contribution, savings }: { memberId: string; roundId: string; label: string; contribution: number; savings: number },
) {
  const { unit: purchaseUnit, charge } = chamaUnit(`round-${roundId}`.slice(0, 256), `${chama.id}:round:${roundId}`, `${chama.name} · ${label}`, [
    { name: "Merry-go-round contribution", amount: contribution },
    { name: "Savings", amount: savings },
  ]);
  const order = await paypalRequest<Order>("/v2/checkout/orders", {
    requestId: `deduction-${roundId}-${memberId}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [purchaseUnit],
      payment_source: { paypal: { vault_id: vaultId } },
    },
  });
  const figures = captureFigures(order);
  return {
    orderId: order.id,
    status: order.status,
    charge,
    ...figures,
    amount: figures.amount ?? charge.total.toFixed(2),
    payerCountry: order.payer?.address?.country_code,
    payerId: order.payer?.payer_id,
  };
}
