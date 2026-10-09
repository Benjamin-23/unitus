import { getSession } from "@/lib/auth/session";
import { getMember } from "@/lib/db";

// The signed-in member, for client components.
export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ member: null }, { status: 401 });
  const member = await getMember(session.memberId);
  if (!member) return Response.json({ member: null }, { status: 401 });
  return Response.json({
    member: { id: member.id, name: member.full_name, email: member.email, paypalVerified: member.paypal_verified },
  });
}
