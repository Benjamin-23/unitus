import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { chamaErrorResponse, getChamaByCode } from "@/lib/chamas";

// Preview a chama's rules from its invite code before joining.
// TODO(backend): rate-limit lookups per member so codes can't be guessed.
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Please log in again." }, { status: 401 });
  try {
    return Response.json({ chama: await getChamaByCode(request.nextUrl.searchParams.get("code") ?? "", session.memberId) });
  } catch (error) {
    return chamaErrorResponse(error);
  }
}
