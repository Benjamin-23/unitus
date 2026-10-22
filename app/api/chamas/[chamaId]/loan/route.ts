import { getSession } from "@/lib/auth/session";
import { LOAN_INSTALMENT_CHOICES, LoanError, takeLoan } from "@/lib/loans";

/** Takes out a loan from the chama's savings; the money goes to the member's wallet. */
export async function POST(request: Request, ctx: RouteContext<"/api/chamas/[chamaId]/loan">) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  const { chamaId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(chamaId)) return Response.json({ error: "Chama not found." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { amount?: unknown; instalments?: unknown } | null;
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || !/^\d+(\.\d{1,2})?$/.test(String(body?.amount))) {
    return Response.json({ error: "Enter an amount like 250 or 250.50." }, { status: 400 });
  }
  const instalments = Number(body?.instalments);
  if (!(LOAN_INSTALMENT_CHOICES as readonly number[]).includes(instalments)) {
    return Response.json({ error: "Choose how many rounds to repay over." }, { status: 400 });
  }

  try {
    const loan = await takeLoan(chamaId, session.memberId, amount, instalments);
    return Response.json({ id: loan.id, principal: loan.principal, total: loan.total, instalment: loan.instalment });
  } catch (error) {
    if (error instanceof LoanError) return Response.json({ error: error.message }, { status: 400 });
    console.error("[loans] loan failed:", (error as Error).message);
    return Response.json({ error: "Couldn't take out the loan. Please try again." }, { status: 500 });
  }
}
