// Server-only Supabase client using the secret (service role) key. It bypasses
// row level security, so never import this from a "use client" file.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Member = {
  id: string;
  paypal_user_id: string;
  email: string | null;
  full_name: string | null;
  email_verified: boolean;
  paypal_verified: boolean;
  created_at: string;
  last_login_at: string;
  paypal_payer_id?: string | null;
  /** ISO country code from PayPal's payer details (migration 0007). */
  country?: string | null;
};

export type PaymentKind = "joining_fee" | "monthly_deduction" | "offer";

let client: SupabaseClient | null = null;

export function db() {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/** Creates the member on first PayPal login, or refreshes their profile. */
export async function upsertMemberFromPayPal(profile: {
  paypalUserId: string;
  email?: string;
  fullName?: string;
  emailVerified: boolean;
  paypalVerified: boolean;
}) {
  const existing = check(
    await db().from("members").select("id").eq("paypal_user_id", profile.paypalUserId).maybeSingle<{ id: string }>(),
  );
  const row = {
    paypal_user_id: profile.paypalUserId,
    email: profile.email ?? null,
    full_name: profile.fullName ?? null,
    email_verified: profile.emailVerified,
    paypal_verified: profile.paypalVerified,
    last_login_at: new Date().toISOString(),
  };
  const member = check(
    await db().from("members").upsert(row, { onConflict: "paypal_user_id" }).select("*").single<Member>(),
  );
  if (!member) throw new Error("Database error: member was not saved");
  return { member, isNew: !existing };
}

export async function getMember(id: string) {
  return check(await db().from("members").select("*").eq("id", id).maybeSingle<Member>());
}

export async function saveVault(memberId: string, vaultId: string, paypalCustomerId?: string) {
  check(
    await db()
      .from("paypal_vaults")
      .upsert(
        { member_id: memberId, vault_id: vaultId, paypal_customer_id: paypalCustomerId ?? null, updated_at: new Date().toISOString() },
        { onConflict: "member_id" },
      ),
  );
}

export async function getVaultId(memberId: string) {
  const row = check(await db().from("paypal_vaults").select("vault_id").eq("member_id", memberId).maybeSingle<{ vault_id: string }>());
  return row?.vault_id ?? null;
}

export async function recordPayment(p: {
  memberId: string;
  chamaId?: string;
  kind: PaymentKind;
  reference?: string;
  orderId: string;
  captureId?: string;
  /** What PayPal charged the member (gross). */
  amount: number;
  /** What belongs to the chama/member balance. Defaults to `amount` (no fee added). */
  principal?: number;
  /** Fee added on top for PayPal (amount - principal). */
  feeCharged?: number;
  /** PayPal's actual fee and the net that reached the pool, once captured. */
  paypalFee?: number;
  netAmount?: number;
  status: string;
  /** Scheduled deductions: the round, and how much of the principal is contribution (the rest is savings). */
  roundId?: string;
  contribution?: number;
  /** Part of the principal that repays a loan (migration 0011). */
  loanRepayment?: number;
  loanId?: string;
}) {
  check(
    await db().from("payments").upsert(
      {
        member_id: p.memberId,
        ...(p.chamaId ? { chama_id: p.chamaId } : {}),
        kind: p.kind,
        reference: p.reference ?? null,
        paypal_order_id: p.orderId,
        paypal_capture_id: p.captureId ?? null,
        amount: p.amount,
        principal: p.principal ?? p.amount,
        fee_charged: p.feeCharged ?? 0,
        ...(p.paypalFee !== undefined ? { paypal_fee: p.paypalFee } : {}),
        ...(p.netAmount !== undefined ? { net_amount: p.netAmount } : {}),
        status: p.status,
        ...(p.roundId ? { round_id: p.roundId, contribution: p.contribution ?? 0 } : {}),
        ...(p.loanId ? { loan_id: p.loanId, loan_repayment: p.loanRepayment ?? 0 } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paypal_order_id" },
    ),
  );
}

/** The member who created an order; used to stop anyone capturing someone else's order. */
export async function getPaymentByOrder(orderId: string) {
  return check(
    await db()
      .from("payments")
      .select("member_id, chama_id, kind, reference, amount, principal, fee_charged, status")
      .eq("paypal_order_id", orderId)
      .maybeSingle<{
        status: string;
        member_id: string;
        chama_id: string | null;
        kind: PaymentKind;
        reference: string | null;
        amount: number;
        principal: number;
        fee_charged: number;
      }>(),
  );
}

/**
 * Saves what PayPal tells us about the payer: their country (for analytics)
 * and payer id (where their merry-go-round payout goes). Never fails the payment.
 */
export async function savePayerDetails(memberId: string, { country, payerId }: { country?: string; payerId?: string }) {
  const update: Record<string, string> = {};
  if (country && /^[A-Z]{2}$/.test(country)) update.country = country;
  if (payerId && /^[A-Z0-9]{8,20}$/.test(payerId)) update.paypal_payer_id = payerId;
  if (Object.keys(update).length === 0) return;
  const { error } = await db().from("members").update(update).eq("id", memberId);
  if (error) console.warn(`[members] could not save payer details: ${error.message}`);
}
