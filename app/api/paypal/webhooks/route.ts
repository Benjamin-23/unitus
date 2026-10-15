import { after } from "next/server";
import { markJoiningFeePaid } from "@/lib/chamas";
import { db, getPaymentByOrder, recordPayment, saveVault } from "@/lib/db";
import { postPayment } from "@/lib/ledger";
import { paypalRequest } from "@/lib/paypal/server";

/**
 * PayPal webhooks. Every event is verified with PayPal before it's used
 * (POST /v1/notifications/verify-webhook-signature), and handling is
 * idempotent, so PayPal's retries and duplicates are harmless.
 *
 *   VAULT.PAYMENT-TOKEN.CREATED  A member's PayPal finished saving after the
 *                                joining fee (vault status was APPROVED, not
 *                                VAULTED). Stores the vault id so rounds can
 *                                charge them.
 *   PAYMENT.CAPTURE.*            A capture completed, was held, denied or
 *                                refunded after the browser left.
 *
 * Register with: node --env-file=.env scripts/register-webhook.mjs https://<public-host>
 */
type Event = { id: string; event_type: string; resource: Record<string, unknown> };

const CAPTURE_STATUS: Record<string, string> = {
  "PAYMENT.CAPTURE.COMPLETED": "COMPLETED",
  "PAYMENT.CAPTURE.PENDING": "PENDING",
  "PAYMENT.CAPTURE.DENIED": "DENIED",
  "PAYMENT.CAPTURE.REFUNDED": "REFUNDED",
};

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return new Response("Webhook not configured", { status: 503 });

  const raw = await request.text();
  let event: Event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const h = (name: string) => request.headers.get(name) ?? "";
  const { verification_status } = await paypalRequest<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    requestId: `verify-${h("paypal-transmission-id") || crypto.randomUUID()}`,
    body: {
      auth_algo: h("paypal-auth-algo"),
      cert_url: h("paypal-cert-url"),
      transmission_id: h("paypal-transmission-id"),
      transmission_sig: h("paypal-transmission-sig"),
      transmission_time: h("paypal-transmission-time"),
      webhook_id: webhookId,
      webhook_event: event,
    },
  });
  if (verification_status !== "SUCCESS") {
    console.warn(`[webhook] rejected ${event.event_type} ${event.id}: signature ${verification_status}`);
    // 200 so a forged request learns nothing and PayPal doesn't retry it.
    return new Response(null, { status: 200 });
  }

  // Reply straight away; do the work after the response.
  after(() =>
    handle(event).catch((error) => console.error(`[webhook] ${event.event_type} ${event.id} failed:`, (error as Error).message)),
  );
  return new Response(null, { status: 200 });
}

async function handle(event: Event) {
  if (event.event_type === "VAULT.PAYMENT-TOKEN.CREATED") return vaultCreated(event);
  if (CAPTURE_STATUS[event.event_type]) return captureChanged(event, CAPTURE_STATUS[event.event_type]);
}

async function vaultCreated(event: Event) {
  const r = event.resource as {
    id?: string;
    customer?: { id?: string };
    payment_source?: { paypal?: { payer_id?: string; email_address?: string } };
  };
  const payerId = r.payment_source?.paypal?.payer_id;
  if (!r.id || !payerId) return;
  // Members' PayPal payer ids are recorded when they pay the joining fee.
  const { data, error } = await db().from("members").select("id").eq("paypal_payer_id", payerId).maybeSingle<{ id: string }>();
  if (error) throw new Error(error.message);
  if (!data) {
    console.warn(`[webhook] saved PayPal for an unknown payer; ignored`);
    return;
  }
  await saveVault(data.id, r.id, r.customer?.id);
  console.info(`[webhook] automatic payments ready for member ${data.id.slice(0, 6)}`);
}

async function captureChanged(event: Event, status: string) {
  const r = event.resource as {
    id?: string;
    amount?: { value?: string };
    seller_receivable_breakdown?: { paypal_fee?: { value: string }; net_amount?: { value: string } };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
  const orderId = r.supplementary_data?.related_ids?.order_id;
  if (!orderId) return;
  const payment = await getPaymentByOrder(orderId);
  if (!payment) return;
  const b = r.seller_receivable_breakdown;
  await recordPayment({
    memberId: payment.member_id,
    chamaId: payment.chama_id ?? undefined,
    kind: payment.kind,
    reference: payment.reference ?? undefined,
    orderId,
    captureId: r.id,
    amount: Number(r.amount?.value ?? payment.amount),
    principal: Number(payment.principal),
    feeCharged: Number(payment.fee_charged),
    paypalFee: b?.paypal_fee ? Number(b.paypal_fee.value) : undefined,
    netAmount: b?.net_amount ? Number(b.net_amount.value) : undefined,
    status,
  });
  if (status === "COMPLETED") {
    if (payment.kind === "joining_fee" && payment.chama_id) await markJoiningFeePaid(payment.chama_id, payment.member_id);
    await postPayment(orderId);
  }
}
