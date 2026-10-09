export const OAUTH_STATE_COOKIE = "unitus_oauth_state";

/**
 * The origin the browser actually used (from the Host header). In development
 * Next reports "localhost" in request.nextUrl even when the page was opened on
 * 127.0.0.1, and cookies only work if we redirect back to the same host.
 */
export function requestOrigin(request: Request & { nextUrl: URL }) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Where PayPal sends the user back to. Must match the Return URL set in the PayPal app exactly. */
export function loginRedirectUri(origin: string) {
  return process.env.PAYPAL_LOGIN_REDIRECT_URI ?? `${origin}/api/auth/paypal/callback`;
}

/** Only allow redirects back into this site, never to another host. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api/") ? next : fallback;
}
