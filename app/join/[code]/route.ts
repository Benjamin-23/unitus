import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/auth/redirects";

// Share links (/join/K7QM-3XPA) open onboarding with the code filled in.
// Onboarding requires login, so signed-out visitors log in with PayPal first and come straight back.
export async function GET(request: NextRequest, ctx: RouteContext<"/join/[code]">) {
  const { code } = await ctx.params;
  const url = new URL("/onboarding", requestOrigin(request));
  url.searchParams.set("code", code.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 9));
  return NextResponse.redirect(url);
}
