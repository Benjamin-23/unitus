import { NextResponse, type NextRequest } from "next/server";
import { loginRedirectUri, OAUTH_STATE_COOKIE, requestOrigin, safeNext } from "@/lib/auth/redirects";
import { authorizeUrl } from "@/lib/paypal/identity";

// Starts "Log in with PayPal": remember a random state (CSRF protection) and
// where to go afterwards, then send the browser to PayPal.
export async function GET(request: NextRequest) {
  // PayPal's app settings reject "localhost" as a Return URL but accept 127.0.0.1.
  // Switch hosts before starting so the state and session cookies live on the
  // same host PayPal returns to.
  const origin = requestOrigin(request);
  if (process.env.NODE_ENV !== "production" && new URL(origin).hostname === "localhost") {
    const url = new URL(request.nextUrl.pathname + request.nextUrl.search, origin);
    url.hostname = "127.0.0.1";
    return NextResponse.redirect(url);
  }

  const state = crypto.randomUUID();
  const next = safeNext(request.nextUrl.searchParams.get("next"), "");
  const response = NextResponse.redirect(authorizeUrl({ state, redirectUri: loginRedirectUri(origin) }));
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/paypal",
    maxAge: 600,
  });
  return response;
}
