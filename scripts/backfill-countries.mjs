#!/usr/bin/env node
// Fills in members' country from PayPal's payer details on their completed
// payments (migration 0007). Safe to re-run; members who already have a
// country are skipped.
//
//   node --env-file=.env scripts/backfill-countries.mjs
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Run with: node --env-file=.env scripts/backfill-countries.mjs");
  process.exit(1);
}
const base = PAYPAL_ENVIRONMENT === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const auth = "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
const { access_token } = await (
  await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })
).json();

const { data: members, error } = await db.from("members").select("id, full_name").is("country", null);
if (error) throw new Error(`${error.message} (has migration 0007 been run?)`);

const names = new Intl.DisplayNames(["en"], { type: "region" });
let filled = 0;
for (const m of members) {
  const { data: payments } = await db
    .from("payments")
    .select("paypal_order_id")
    .eq("member_id", m.id)
    .eq("status", "COMPLETED")
    .order("created_at", { ascending: false })
    .limit(3);
  for (const p of payments ?? []) {
    const res = await fetch(`${base}/v2/checkout/orders/${p.paypal_order_id}`, { headers: { Authorization: `Bearer ${access_token}` } });
    const country = res.ok ? (await res.json()).payer?.address?.country_code : undefined;
    if (country && /^[A-Z]{2}$/.test(country)) {
      const { error: e } = await db.from("members").update({ country }).eq("id", m.id);
      if (e) throw new Error(e.message);
      console.log(`${(m.full_name ?? "Member").padEnd(24)} ${country}  ${names.of(country)}`);
      filled++;
      break;
    }
  }
}
console.log(`\n${members.length} members without a country · ${filled} filled from PayPal`);
