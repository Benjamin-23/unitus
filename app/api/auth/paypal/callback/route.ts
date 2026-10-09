import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieOptions, SESSION_COOKIE, signSession } from "@/lib/auth/session";
import { OAUTH_STATE_COOKIE, requestOrigin, safeNext } from "@/lib/auth/redirects";
import { upsertMemberFromPayPal } from "@/lib/db";
import { exchangeCode, getUserInfo, PROFILE_REFUSED } from "@/lib/paypal/identity";
import { PayPalError } from "@/lib/paypal/server";

function fail(request: NextRequest, reason: string) {
  const url = new URL("/login", requestOrigin(request));
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/paypal" });
  return response;
}

// PayPal redirects here with ?code=...&state=... after the user signs in.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (params.get("error")) return fail(request, "cancelled");

  let saved: { state?: string; next?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "{}");
  } catch {}
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) return fail(request, "expired");

  try {
    const accessToken = await exchangeCode(code);
    const profile = await getUserInfo(accessToken);
    const { member, isNew } = await upsertMemberFromPayPal(profile);

    // Go where they were headed (e.g. "Start a chama"); otherwise new members
    // join a chama first and returning members see their dashboard.
    const destination = saved.next ? safeNext(saved.next) : isNew ? "/onboarding" : "/dashboard";
    const response = NextResponse.redirect(new URL(destination, requestOrigin(request)));
    response.cookies.set(
      SESSION_COOKIE,
      await signSession({ memberId: member.id, name: member.full_name ?? undefined, email: member.email ?? undefined }),
      sessionCookieOptions,
    );
    response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: "/api/auth/paypal" });
    return response;
  } catch (error) {
    console.error("[auth] PayPal login failed", error);
    // PayPal refuses to share a Business account's profile with Log in with PayPal.
    const profileRefused = error instanceof PayPalError && error.message === PROFILE_REFUSED;
    return fail(request, profileRefused ? "profile" : "paypal");
  }
}
