import { getSession } from "@/lib/auth/session";
import { markJoiningFeePaid } from "@/lib/chamas";
import { postPayment } from "@/lib/ledger";
import { getPaymentByOrder, recordPayment, saveVault, savePayerDetails } from "@/lib/db";
import { captureOrder } from "@/lib/paypal/orders";
import { paypalErrorResponse } from "@/lib/paypal/server";

export async function POST(_request: Request, ctx: RouteContext<"/api/paypal/orders/[orderId]/capture">) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });

  const { orderId } = await ctx.params;
  if (!/^[A-Z0-9]{10,30}$/.test(orderId)) return Response.json({ error: "Invalid order id." }, { status: 400 });

  try {
    const payment = await getPaymentByOrder(orderId);
    if (!payment || payment.member_id !== session.memberId) {
      return Response.json({ error: "Payment not found." }, { status: 404 });
    }
    const { vaultId, paypalCustomerId, payerCountry, payerId, ...result } = await captureOrder(orderId);
    await recordPayment({
      memberId: session.memberId,
      chamaId: payment.chama_id ?? undefined,
      kind: payment.kind,
      reference: payment.reference ?? undefined,
      orderId,
      captureId: result.captureId,
      amount: Number(result.amount ?? payment.amount),
      principal: Number(payment.principal),
      feeCharged: Number(payment.fee_charged),
      paypalFee: result.paypalFee,
      netAmount: result.netAmount,
      status: result.status,
    });
    if (payment.kind === "joining_fee" && payment.chama_id && result.status === "COMPLETED") {
      await markJoiningFeePaid(payment.chama_id, session.memberId);
    }
    // Credit the chama's accounts in the ledger (no-op unless COMPLETED; idempotent).
    if (result.status === "COMPLETED") await postPayment(orderId);
    if (result.status === "COMPLETED") await savePayerDetails(session.memberId, { country: payerCountry, payerId });
    // The joining fee also saves the member's PayPal for monthly auto-deductions.
    if (vaultId) await saveVault(session.memberId, vaultId, paypalCustomerId);
    return Response.json({ ...result, paypalSaved: Boolean(vaultId) });
  } catch (error) {
    return paypalErrorResponse(error);
  }
}
