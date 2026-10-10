// Log in with PayPal (OpenID Connect, authorization code flow). Server-only.
// Docs: https://developer.paypal.com/docs/log-in-with-paypal/integrate/
import { PAYPAL_API_BASE, PAYPAL_ENV, PayPalError } from "./server";

const AUTHORIZE_URL = PAYPAL_ENV === "production" ? "https://www.paypal.com/connect" : "https://www.sandbox.paypal.com/connect";

// Must match the scopes enabled under "Log in with PayPal" > Advanced settings in the app.
const SCOPES = "openid profile email";

export function authorizeUrl({ state, redirectUri }: { state: string; redirectUri: string }) {
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: process.env.PAYPAL_CLIENT_ID ?? "",
    response_type: "code",
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  // PayPal expects %20 between scopes, not "+".
  return `${AUTHORIZE_URL}?${params.toString().replace(/\+/g, "%20")}`;
}

function basicAuth() {
  return "Basic " + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
}

/** Swaps the one-time code from the redirect for the user's access token. */
export async function exchangeCode(code: string) {
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", code }),
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`[paypal] login code exchange failed: ${res.status} ${data.error} debug_id=${res.headers.get("paypal-debug-id")}`);
    throw new PayPalError(data.error_description ?? "PayPal login failed", res.status, data.error);
  }
  // Which permissions PayPal granted (no personal data). Helps diagnose profile errors.
  console.info(`[paypal] login token granted scopes: ${data.scope ?? "(none listed)"}`);
  return data.access_token as string;
}

type UserInfo = {
  user_id?: string;
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  verified_account?: boolean | string;
  emails?: { value: string; primary?: boolean; confirmed?: boolean }[];
};

export const PROFILE_REFUSED = "PayPal didn't share the account profile";

const IDENTITY_PREFIX = "https://www.paypal.com/webapps/auth/identity/user/";

/** The same PayPal account must always map to the same member, whichever endpoint answered. */
function canonicalUserId(id: string) {
  return id.startsWith("https://") ? id : IDENTITY_PREFIX + id;
}

// PayPal documents two profile endpoints: the OpenID Connect one (API spec) and
// the one in the Log in with PayPal guide. Try both; sandbox sometimes refuses one.
const USERINFO_ENDPOINTS = ["/v1/identity/openidconnect/userinfo?schema=openid", "/v1/identity/oauth2/userinfo?schema=paypalv1.1"];

async function fetchUserInfo(path: string, accessToken: string) {
  const res = await fetch(`${PAYPAL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await res.text();
  let data: UserInfo & { error?: string; error_description?: string; name?: string; message?: string; debug_id?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {}
  if (!res.ok) {
    // Error bodies hold no personal data; log enough to diagnose with PayPal support.
    console.error(
      `[paypal] userinfo ${path.split("?")[0]} failed: ${res.status}`,
      JSON.stringify({
        error: data.error ?? data.name,
        description: data.error_description ?? data.message,
        debugId: data.debug_id ?? res.headers.get("paypal-debug-id"),
        wwwAuthenticate: res.headers.get("www-authenticate"),
      }),
    );
    return { ok: false as const, status: res.status, issue: data.error ?? data.name };
  }
  return { ok: true as const, data };
}

/** The signed-in PayPal user's profile. */
export async function getUserInfo(accessToken: string) {
  let data: UserInfo | null = null;
  let last: { status: number; issue?: string } = { status: 502 };
  for (const path of USERINFO_ENDPOINTS) {
    const result = await fetchUserInfo(path, accessToken);
    if (result.ok) {
      data = result.data;
      break;
    }
    last = result;
  }
  if (!data) throw new PayPalError(PROFILE_REFUSED, last.status, last.issue);

  const rawId = data.user_id ?? data.sub;
  if (!rawId) throw new PayPalError("PayPal didn't return an account id", 502);
  const primaryEmail = data.emails?.find((e) => e.primary) ?? data.emails?.[0];
  return {
    paypalUserId: canonicalUserId(rawId),
    fullName: data.name ?? ([data.given_name, data.family_name].filter(Boolean).join(" ") || undefined),
    email: data.email ?? primaryEmail?.value,
    emailVerified: data.email_verified ?? primaryEmail?.confirmed ?? false,
    paypalVerified: data.verified_account === true || data.verified_account === "true",
  };
}
