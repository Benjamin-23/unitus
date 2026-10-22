// Server-only: payouts with the PayPal Payouts API, from the Unitus pool
// account to a member's PayPal. Members withdraw from their Unitus wallet this
// way; rounds before wallets existed paid the pot out directly
// (docs/payments-architecture.md §3).
import { paypalRequest } from "@/lib/paypal/server";

type PayoutItem = {
  payout_item_id: string;
  transaction_status: string;
  payout_item_fee?: { value: string };
  errors?: { name?: string; message?: string };
};

/**
 * Sends one payout. `id` is unique per payout (e.g. `withdrawal-<uuid>`) and is
 * both the PayPal-Request-Id and the batch id, so sending twice returns the
 * first payout or is refused, never paid twice.
 */
export async function sendPayout({
  id,
  amount,
  receiver,
  subject,
  note,
}: {
  id: string;
  amount: number;
  receiver: { payerId: string } | { email: string };
  subject: string;
  note: string;
}) {
  const data = await paypalRequest<{ batch_header: { payout_batch_id: string; batch_status: string } }>("/v1/payments/payouts", {
    requestId: `payout-${id}`,
    body: {
      sender_batch_header: { sender_batch_id: id, email_subject: subject, email_message: note },
      items: [
        {
          ...("payerId" in receiver ? { recipient_type: "PAYPAL_ID", receiver: receiver.payerId } : { recipient_type: "EMAIL", receiver: receiver.email }),
          amount: { value: amount.toFixed(2), currency: "USD" },
          sender_item_id: id,
          note,
        },
      ],
    },
  });
  return { batchId: data.batch_header.payout_batch_id, status: data.batch_header.batch_status };
}

/** Funds have left the pool for these item statuses (UNCLAIMED is held for the recipient). */
const SENT = new Set(["SUCCESS", "UNCLAIMED"]);
const FAILED = new Set(["FAILED", "RETURNED", "BLOCKED", "DENIED", "REVERSED", "REFUNDED", "CANCELED"]);

/** Where a payout is: still going, sent (with PayPal's fee), or failed. */
export async function checkPayout(batchId: string) {
  const data = await paypalRequest<{ items?: PayoutItem[] }>(`/v1/payments/payouts/${encodeURIComponent(batchId)}`, { method: "GET" });
  const item = data.items?.[0];
  const status = item?.transaction_status ?? "PENDING";
  return {
    itemId: item?.payout_item_id,
    status,
    fee: item?.payout_item_fee ? Number(item.payout_item_fee.value) : 0,
    outcome: SENT.has(status) ? ("sent" as const) : FAILED.has(status) ? ("failed" as const) : ("pending" as const),
    error: item?.errors?.message,
  };
}
