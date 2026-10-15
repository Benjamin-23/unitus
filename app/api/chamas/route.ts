import { getSession } from "@/lib/auth/session";
import { isFrequency } from "@/lib/schedule";
import { chamaErrorResponse, createChama, listMyChamas, type CreateChamaInput } from "@/lib/chamas";

// Creates a chama with the signed-in member as its admin. Rules lock on creation.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Partial<CreateChamaInput> | null;
  if (!body) return Response.json({ error: "Missing chama details." }, { status: 400 });

  const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
  try {
    const chama = await createChama(session.memberId, {
      name: String(body.name ?? ""),
      description: typeof body.description === "string" ? body.description : undefined,
      memberCount: num(body.memberCount),
      startsAt: String(body.startsAt ?? ""),
      frequency: isFrequency(body.frequency) ? body.frequency : ("" as never),
      monthlyContribution: num(body.monthlyContribution),
      monthlySavings: num(body.monthlySavings),
      joiningFee: num(body.joiningFee),
      shareOut: body.shareOut === "mid-year" ? "mid-year" : "year-end",
      loanMultiplier: num(body.loanMultiplier),
      loanInterestRate: num(body.loanInterestRate),
    });
    return Response.json({ id: chama.id, inviteCode: chama.invite_code }, { status: 201 });
  } catch (error) {
    return chamaErrorResponse(error);
  }
}

// The signed-in member's chamas.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  try {
    return Response.json({ chamas: await listMyChamas(session.memberId) });
  } catch (error) {
    return chamaErrorResponse(error);
  }
}
