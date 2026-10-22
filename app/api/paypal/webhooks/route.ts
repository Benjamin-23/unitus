import { after } from "next/server";
import { markJoiningFeePaid } from "@/lib/chamas";
import { db, getPaymentByOrder, recordPayment, saveVault } from "@/lib/db";
import { postPayment } from "@/lib/ledger";
import { PayPalError, paypalRequest } from "@/lib/paypal/server";

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

  const verification_status = await verify(request, event, webhookId);
  if (verification_status !== "SUCCESS") {
    console.warn(`[webhook] rejected ${event.event_type} ${event.id}: signature ${verification_status}`);
    // 200 so a forged request learns nothing and PayPal doesn't retry it.
    return new Response(null, { status: 200 });
  }

  // A saved PayPal is matched to a member by the payer id stored when their
  // capture returns, and the webhook can beat that. Check before replying: a
  // non-2xx makes PayPal deliver it again later instead of it being lost.
  if (event.event_type === "VAULT.PAYMENT-TOKEN.CREATED") {
    const saved = await vaultCreated(event);
    return new Response(null, { status: saved === "unknown-payer" ? 503 : 200 });
  }

  // Reply straight away; do the work after the response.
  after(() =>
    handle(event).catch((error) => console.error(`[webhook] ${event.event_type} ${event.id} failed:`, (error as Error).message)),
  );
  return new Response(null, { status: 200 });
}

/**
 * Asks PayPal whether the event really came from PayPal. A request PayPal
 * rejects as malformed (4xx) is a failure like a bad signature; network
 * trouble or a PayPal 5xx throws, so PayPal redelivers the event later.
 */
async function verify(request: Request, event: Event, webhookId: string) {
  const h = (name: string) => request.headers.get(name) ?? "";
  try {
    const { verification_status } = await paypalRequest<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
      requestId: `verify-${crypto.randomUUID()}`,
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
    return verification_status;
  } catch (error) {
    if (error instanceof PayPalError && error.status >= 400 && error.status < 500) return "MALFORMED";
    throw error;
  }
}

async function handle(event: Event) {
  if (CAPTURE_STATUS[event.event_type]) return captureChanged(event, CAPTURE_STATUS[event.event_type]);
}

/** PayPal doesn't guarantee event order: a late PENDING mustn't undo a COMPLETED. */
function canMove(from: string, to: string) {
  if (from === to) return false;
  if (from === "REFUNDED") return false;
  if (from === "COMPLETED" || from === "DENIED") return to === "REFUNDED";
  return true;
}

async function vaultCreated(event: Event): Promise<"saved" | "unknown-payer" | "ignored"> {
  const r = event.resource as {
    id?: string;
    customer?: { id?: string };
    payment_source?: { paypal?: { payer_id?: string; email_address?: string } };
  };
  const payerId = r.payment_source?.paypal?.payer_id;
  if (!r.id || !payerId) return "ignored";
  // Members' PayPal payer ids are recorded when they pay the joining fee.
  const { data, error } = await db().from("members").select("id").eq("paypal_payer_id", payerId).maybeSingle<{ id: string }>();
  if (error) throw new Error(error.message);
  if (!data) {
    console.warn(`[webhook] saved PayPal for a payer we don't know yet; asking PayPal to resend`);
    return "unknown-payer";
  }
  await saveVault(data.id, r.id, r.customer?.id);
  console.info(`[webhook] automatic payments ready for member ${data.id.slice(0, 6)}`);
  return "saved";
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
  if (!canMove(payment.status, status)) return;
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
