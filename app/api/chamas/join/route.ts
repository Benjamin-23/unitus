import { getSession } from "@/lib/auth/session";
import { chamaErrorResponse, joinChama } from "@/lib/chamas";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (typeof body?.code !== "string") return Response.json({ error: "Missing invite code." }, { status: 400 });
  try {
    return Response.json(await joinChama(session.memberId, body.code));
  } catch (error) {
    return chamaErrorResponse(error);
  }
}
