import { getSession } from "@/lib/auth/session";
import { WalletError, withdraw } from "@/lib/member-wallet";

/** Withdraws from the signed-in member's Unitus wallet to their PayPal. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { amount?: unknown } | null;
  const amount = typeof body?.amount === "number" ? body.amount : Number(body?.amount);
  if (!Number.isFinite(amount) || !/^\d+(\.\d{1,2})?$/.test(String(body?.amount))) {
    return Response.json({ error: "Enter an amount like 250 or 250.50." }, { status: 400 });
  }

  try {
    const w = await withdraw(session.memberId, amount);
    return Response.json({ id: w.id, status: w.status, amount: Number(w.amount) });
  } catch (error) {
    if (error instanceof WalletError) return Response.json({ error: error.message }, { status: 400 });
    console.error("[wallet] withdrawal failed:", (error as Error).message);
    return Response.json({ error: "PayPal didn't confirm the withdrawal yet. It shows as pending and Unitus keeps trying; if it fails, the money goes back to your wallet." }, { status: 500 });
  }
}
