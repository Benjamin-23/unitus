// Server-only: merry-go-round payouts with the PayPal Payouts API. Money goes
// from the Unitus pool account to the round's recipient; only the scheduler
// calls this (docs/payments-architecture.md §3).
import { paypalRequest } from "@/lib/paypal/server";

type PayoutItem = {
  payout_item_id: string;
  transaction_status: string;
  payout_item_fee?: { value: string };
  errors?: { name?: string; message?: string };
};

/**
 * Sends one payout. The batch id is the round id, so sending twice is refused
 * by PayPal rather than paying twice.
 */
export async function sendPayout({
  roundId,
  amount,
  receiver,
  note,
}: {
  roundId: string;
  amount: number;
  receiver: { payerId: string } | { email: string };
  note: string;
}) {
  const data = await paypalRequest<{ batch_header: { payout_batch_id: string; batch_status: string } }>("/v1/payments/payouts", {
    requestId: `payout-${roundId}`,
    body: {
      sender_batch_header: { sender_batch_id: `round-${roundId}`, email_subject: "Your Unitus merry-go-round payout", email_message: note },
      items: [
        {
          ...("payerId" in receiver ? { recipient_type: "PAYPAL_ID", receiver: receiver.payerId } : { recipient_type: "EMAIL", receiver: receiver.email }),
          amount: { value: amount.toFixed(2), currency: "USD" },
          sender_item_id: roundId,
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
