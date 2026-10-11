// Server-side PayPal REST client. Never import this from a "use client" file:
// it reads PAYPAL_CLIENT_SECRET.

const ENV = process.env.PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";

export const PAYPAL_API_BASE = ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
export const PAYPAL_ENV = ENV;

/**
 * Where members can see their own PayPal balance. PayPal doesn't share a
 * personal account's balance with apps, so we link to PayPal instead.
 */
export const PAYPAL_ACCOUNT_URL = ENV === "production" ? "https://www.paypal.com/myaccount/summary" : "https://www.sandbox.paypal.com/myaccount/summary";

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issue?: string,
    readonly debugId?: string,
  ) {
    super(message);
  }
}

function credentials() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new PayPalError("PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in .env", 500);
  }
  return "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
}

// Access tokens last hours; reuse one until shortly before it expires.
let cached: { token: string; expiresAt: number } | null = null;

export async function getAccessToken() {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: credentials(), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new PayPalError(data.error_description ?? "Could not get a PayPal access token", res.status, data.error);
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

/**
 * Browser-safe client token for the v6 Web SDK, needed to save PayPal for
 * later (vaulting). It's short-lived and can't move money on its own.
 */
export async function createClientToken() {
  const body = new URLSearchParams({ grant_type: "client_credentials", response_type: "client_token" });
  // Production only: list the site's registered domains. PayPal rejects localhost.
  if (ENV === "production" && process.env.PAYPAL_DOMAINS) body.append("domains[]", process.env.PAYPAL_DOMAINS);
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: credentials(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) throw new PayPalError(data.error_description ?? "Could not create a client token", res.status, data.error);
  // The client token is returned in `access_token`, even with response_type=client_token.
  return data.access_token as string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls the PayPal REST API. Every POST carries a PayPal-Request-Id (reused on
 * retries, so a retry can't charge twice). 429s and 5xx responses are retried
 * with exponential backoff; errors are logged with PayPal's debug_id.
 */
export async function paypalRequest<T>(
  path: string,
  { method = "POST", body, requestId = crypto.randomUUID() }: { method?: string; body?: unknown; requestId?: string } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(method === "POST" ? { "PayPal-Request-Id": requestId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) return (await res.json()) as T;

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < 3) {
      await sleep(2 ** attempt * 500);
      continue;
    }
    if (res.status === 401) cached = null;

    const data = await res.json().catch(() => ({}));
    const debugId = data.debug_id ?? res.headers.get("paypal-debug-id") ?? undefined;
    const issue: string | undefined = data.details?.[0]?.issue ?? data.name;
    console.error(`[paypal] ${method} ${path} failed: ${res.status} ${issue ?? ""} debug_id=${debugId}`);
    throw new PayPalError(data.details?.[0]?.description ?? data.message ?? "PayPal request failed", res.status, issue, debugId);
  }
}

/** Turns a thrown error into a JSON response for route handlers. */
export function paypalErrorResponse(error: unknown) {
  if (error instanceof PayPalError) {
    const message =
      error.issue === "INSTRUMENT_DECLINED"
        ? "Your PayPal payment method was declined. Please choose another one in PayPal and try again."
        : error.message;
    return Response.json({ error: message, issue: error.issue, debugId: error.debugId }, { status: error.status >= 500 ? 502 : error.status });
  }
  console.error("[paypal] unexpected error", error);
  return Response.json({ error: "Something went wrong talking to PayPal." }, { status: 500 });
}
