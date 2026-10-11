#!/usr/bin/env node
// Posts existing payments into the double-entry ledger (migration 0006).
//
//   node --env-file=.env scripts/ledger-backfill.mjs
//
// 1. For completed chama payments missing PayPal's fee/net (captured before fee
//    tracking existed), reads the real figures from PayPal's capture and records them.
// 2. Posts every completed chama payment to the ledger. Safe to re-run: posting is
//    idempotent and already-posted payments are skipped by the database.
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error("Run with: node --env-file=.env scripts/ledger-backfill.mjs");
  process.exit(1);
}
const base = PAYPAL_ENVIRONMENT === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const auth = "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
const { access_token } = await (
  await fetch(`${base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" })
).json();

const { data: payments, error } = await db
  .from("payments")
  .select("id, paypal_order_id, paypal_capture_id, kind, principal, paypal_fee, net_amount")
  .eq("status", "COMPLETED")
  .not("chama_id", "is", null)
  .in("kind", ["joining_fee", "monthly_deduction"])
  .order("created_at");
if (error) throw new Error(error.message);

let filled = 0;
let posted = 0;
for (const p of payments) {
  if (p.net_amount === null && p.paypal_capture_id) {
    const res = await fetch(`${base}/v2/payments/captures/${p.paypal_capture_id}`, { headers: { Authorization: `Bearer ${access_token}` } });
    const capture = await res.json();
    const b = capture.seller_receivable_breakdown;
    if (res.ok && b?.net_amount) {
      const { error: e } = await db
        .from("payments")
        .update({ paypal_fee: Number(b.paypal_fee?.value ?? 0), net_amount: Number(b.net_amount.value), updated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (e) throw new Error(e.message);
      filled++;
      console.log(`fee recorded  ${p.kind} ${p.paypal_order_id}: PayPal fee ${b.paypal_fee?.value}, net ${b.net_amount.value}`);
    } else {
      console.warn(`could not read capture for ${p.paypal_order_id} (${res.status}); posting with principal as net`);
    }
  }
  const { data: tx, error: e } = await db.rpc("ledger_post_payment", { p_order_id: p.paypal_order_id });
  if (e) throw new Error(`posting ${p.paypal_order_id}: ${e.message}`);
  if (tx) posted++;
}

console.log(`\n${payments.length} completed chama payments · ${filled} fee records filled · ${posted} posted (already-posted ones included)`);
const { data: balances } = await db.from("ledger_balances").select("number, name, balance").order("number");
for (const b of balances ?? []) console.log(`${b.number.padEnd(28)} ${b.name.padEnd(36)} ${Number(b.balance).toFixed(2).padStart(10)}`);
