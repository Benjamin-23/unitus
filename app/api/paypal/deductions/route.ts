import { getSession } from "@/lib/auth/session";
import { listChargeableChamas } from "@/lib/chamas";
import { findDeduction, getVaultId, recordPayment } from "@/lib/db";
import { chargeMonthlyDeduction, deductionPeriod } from "@/lib/paypal/orders";
import { paypalErrorResponse } from "@/lib/paypal/server";

/**
 * Charges this month's auto-deduction for one of the member's chamas to their
 * saved PayPal. In production a scheduler runs this on the deduction day; the
 * dashboard button lets you trigger it by hand in the sandbox.
 *
 * Body: { chamaId?: string }. Optional when the member is in exactly one chama.
 */
export async function POST(request: Request) {
  // Money movement is automated server logic only (docs/payments-architecture.md §3).
  // This member-triggered route exists for sandbox testing and is off in production.
  if (process.env.NODE_ENV === "production" && process.env.PAYPAL_ENVIRONMENT !== "sandbox") {
    return Response.json({ error: "Not available." }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { chamaId?: unknown };

  try {
    const chamas = await listChargeableChamas(session.memberId);
    if (chamas.length === 0) {
      return Response.json({ error: "Join a chama and pay its joining fee first." }, { status: 409 });
    }
    const chama = typeof body.chamaId === "string" ? chamas.find((c) => c.id === body.chamaId) : chamas.length === 1 ? chamas[0] : undefined;
    if (!chama) {
      return Response.json({ error: "Choose which chama to pay.", chamas: chamas.map(({ id, name }) => ({ id, name })) }, { status: 400 });
    }

    const vaultId = await getVaultId(session.memberId);
    if (!vaultId) {
      return Response.json({ error: "No saved PayPal yet. Pay your joining fee in onboarding first." }, { status: 409 });
    }

    // One deduction per chama per month.
    const period = deductionPeriod();
    const existing = await findDeduction(session.memberId, chama.id, period);
    if (existing) {
      return Response.json(
        { error: `This month's contribution to ${chama.name} has already been collected.`, orderId: existing.paypal_order_id },
        { status: 409 },
      );
    }

    const result = await chargeMonthlyDeduction(vaultId, chama, { memberId: session.memberId, period });
    await recordPayment({
      memberId: session.memberId,
      chamaId: chama.id,
      kind: "monthly_deduction",
      reference: period,
      orderId: result.orderId,
      captureId: result.captureId,
      amount: Number(result.amount),
      principal: result.charge.principal,
      feeCharged: result.charge.fee,
      paypalFee: result.paypalFee,
      netAmount: result.netAmount,
      status: result.status,
    });
    return Response.json({ ...result, chama: chama.name, period });
  } catch (error) {
    return paypalErrorResponse(error);
  }
}
