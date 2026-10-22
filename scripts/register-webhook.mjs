#!/usr/bin/env node
// Registers Unitus's PayPal webhook and saves its id to .env as PAYPAL_WEBHOOK_ID.
// PayPal only delivers to a public HTTPS address: your deployed site, or a
// tunnel to your machine while developing (e.g. `cloudflared tunnel --url http://127.0.0.1:3000`).
//
//   node --env-file=.env scripts/register-webhook.mjs https://<public-host>
//
// Re-running with a new address replaces the old Unitus webhook.
import { readFileSync, writeFileSync } from "node:fs";

const host = process.argv[2]?.replace(/\/$/, "");
if (!host?.startsWith("https://")) {
  console.error("Usage: node --env-file=.env scripts/register-webhook.mjs https://<public-host>");
  process.exit(1);
}
const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT } = process.env;
const base = PAYPAL_ENVIRONMENT === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const auth = "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
const { access_token } = await (
  await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })
).json();
const headers = { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" };

const url = `${host}/api/paypal/webhooks`;
// Only the events Unitus handles (no wildcard).
const event_types = ["VAULT.PAYMENT-TOKEN.CREATED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED"].map((name) => ({ name }));

// Replace any earlier Unitus webhook (PayPal allows a limited number per app).
const existing = await (await fetch(`${base}/v1/notifications/webhooks`, { headers })).json();
for (const w of existing.webhooks ?? []) {
  if (w.url.endsWith("/api/paypal/webhooks")) {
    await fetch(`${base}/v1/notifications/webhooks/${w.id}`, { method: "DELETE", headers });
    console.log(`removed old webhook for ${w.url}`);
  }
}

const res = await fetch(`${base}/v1/notifications/webhooks`, { method: "POST", headers, body: JSON.stringify({ url, event_types }) });
const data = await res.json();
if (!res.ok) {
  console.error(`PayPal refused the webhook (${res.status}): ${data.details?.[0]?.description ?? data.message}`);
  process.exit(1);
}

const env = readFileSync(".env", "utf8");
const line = `PAYPAL_WEBHOOK_ID=${data.id}`;
writeFileSync(".env", /^PAYPAL_WEBHOOK_ID=.*$/m.test(env) ? env.replace(/^PAYPAL_WEBHOOK_ID=.*$/m, line) : env.replace(/\n?$/, `\n${line}\n`));
console.log(`webhook registered for ${url}\nsaved PAYPAL_WEBHOOK_ID to .env. Restart the app so it picks it up.`);
