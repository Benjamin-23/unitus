import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getChamaRow, getMembership } from "@/lib/chamas";
import { memberPayout } from "@/lib/dashboard";
import { recordPayment } from "@/lib/db";
import { createOrder, type OrderPurpose } from "@/lib/paypal/orders";
import { paypalErrorResponse } from "@/lib/paypal/server";

function parse(body: unknown): OrderPurpose | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.purpose === "joining-fee" && typeof b.chamaId === "string" && /^[0-9a-f-]{36}$/i.test(b.chamaId)) {
    return { purpose: "joining-fee", chamaId: b.chamaId };
  }
  if (b.purpose === "offer" && typeof b.offerId === "string" && /^o_[a-z0-9_]+$/i.test(b.offerId)) {
    return { purpose: "offer", offerId: b.offerId };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });

  const purpose = parse(await request.json().catch(() => null));
  if (!purpose) return Response.json({ error: "Unknown payment." }, { status: 400 });
  try {
    let chama: { id: string; name: string; joiningFee: number } | undefined;
    if (purpose.purpose === "joining-fee") {
      // Only members who haven't paid yet can pay a chama's joining fee.
      const [row, membership] = await Promise.all([getChamaRow(purpose.chamaId), getMembership(purpose.chamaId, session.memberId)]);
      if (row && row.created_by === session.memberId) {
        return Response.json(
          { error: "This is the chama's admin account, which can't pay into it. Log in with a different PayPal account to join and pay." },
          { status: 403 },
        );
      }
      if (!row || !membership) return Response.json({ error: "Join the chama before paying its joining fee." }, { status: 403 });
      if (membership.joining_fee_paid_at) return Response.json({ error: "You've already paid this joining fee." }, { status: 409 });
      chama = { id: row.id, name: row.name, joiningFee: Number(row.joining_fee) };
    }
    // Offers are sized against the member's real merry-go-round payout.
    const payout = purpose.purpose === "offer" ? await memberPayout(session.memberId) : 0;
    const { order, charge } = await createOrder(purpose, request.nextUrl.origin, { chama, payout });
    // Record the order against this member so only they can capture it.
    await recordPayment({
      memberId: session.memberId,
      chamaId: chama?.id,
      kind: purpose.purpose === "joining-fee" ? "joining_fee" : "offer",
      reference: purpose.purpose === "offer" ? purpose.offerId : undefined,
      orderId: order.id,
      amount: Number(order.purchase_units?.[0]?.amount?.value ?? 0),
      principal: charge?.principal,
      feeCharged: charge?.fee,
      status: order.status,
    });
    return Response.json({ id: order.id });
  } catch (error) {
    return paypalErrorResponse(error);
  }
}
