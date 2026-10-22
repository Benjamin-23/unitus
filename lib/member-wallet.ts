// Server-only: a member's Unitus wallet (migration 0010). Won pots are credited
// here; members withdraw to their PayPal or (soon) spend with partners.
import { db } from "@/lib/db";
import { checkPayout, sendPayout } from "@/lib/paypal/payouts";
import { PayPalError, PayPalUnreachable } from "@/lib/paypal/server";

export const MIN_WITHDRAWAL = 1;

export type WithdrawalStatus = "requested" | "sending" | "sent" | "failed";

type WithdrawalRow = {
  id: string;
  member_id: string;
  amount: number;
  status: WithdrawalStatus;
  payout_batch_id: string | null;
  payout_status: string | null;
  payout_fee: number | null;
  created_at: string;
  completed_at: string | null;
};

export type WalletActivity = {
  date: string;
  description: string;
  /** Into the wallet (+) or out of it (-). */
  amount: number;
  balance: number;
};

export type MemberWallet = {
  number: string | null;
  balance: number;
  /** Withdrawals PayPal hasn't confirmed yet. */
  pending: number;
  activity: WalletActivity[];
  withdrawals: { id: string; date: string; amount: number; status: WithdrawalStatus; detail: string | null }[];
};

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class WalletError extends Error {}

export async function getMemberWallet(memberId: string): Promise<MemberWallet> {
  const [account, withdrawals] = await Promise.all([
    db().from("ledger_accounts").select("id, number").eq("kind", "member_wallet").eq("member_id", memberId).maybeSingle<{ id: string; number: string }>(),
    db().from("withdrawals").select("*").eq("member_id", memberId).order("created_at", { ascending: false }).limit(50),
  ]);
  const acc = check(account);
  const rows = check(withdrawals) as WithdrawalRow[];

  let activity: WalletActivity[] = [];
  if (acc) {
    const entries = check(
      await db()
        .from("ledger_entries")
        .select("amount, ledger_transactions(description, occurred_at, chamas(name))")
        .eq("account_id", acc.id),
    ) as unknown as { amount: number; ledger_transactions: { description: string; occurred_at: string; chamas: { name: string } | null } }[];
    let balance = 0;
    activity = entries
      .map((e) => ({
        date: e.ledger_transactions.occurred_at,
        description: e.ledger_transactions.chamas ? `${e.ledger_transactions.chamas.name} · ${e.ledger_transactions.description}` : e.ledger_transactions.description,
        // Credit accounts: a negative entry adds to the wallet.
        amount: -Number(e.amount),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ ...e, balance: (balance = round2(balance + e.amount)) }))
      .reverse();
  }

  return {
    number: acc?.number ?? null,
    balance: activity[0]?.balance ?? 0,
    pending: round2(rows.filter((w) => w.status === "requested" || w.status === "sending").reduce((s, w) => s + Number(w.amount), 0)),
    activity,
    withdrawals: rows.map((w) => ({
      id: w.id,
      date: w.completed_at ?? w.created_at,
      amount: Number(w.amount),
      status: w.status,
      detail: w.status === "failed" ? w.payout_status : null,
    })),
  };
}

/** Takes the amount out of the wallet and sends it to the member's PayPal. */
export async function withdraw(memberId: string, amount: number) {
  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) throw new WalletError(`The smallest withdrawal is $${MIN_WITHDRAWAL}.`);
  const { data, error } = await db().rpc("request_withdrawal", { p_member: memberId, p_amount: round2(amount) });
  if (error) throw new WalletError(error.code === "23514" ? error.message : "Couldn't start the withdrawal. Please try again.");
  const w = data as WithdrawalRow;
  await sendWithdrawal(w);
  const { data: latest } = await db().from("withdrawals").select("*").eq("id", w.id).single<WithdrawalRow>();
  return latest ?? w;
}

async function receiverFor(memberId: string) {
  const { data } = await db().from("members").select("email, paypal_payer_id").eq("id", memberId).single<{ email: string | null; paypal_payer_id: string | null }>();
  if (data?.paypal_payer_id) return { payerId: data.paypal_payer_id };
  if (data?.email) return { email: data.email };
  return null;
}

/**
 * Sends a requested withdrawal to PayPal. If PayPal can't be reached it stays
 * `requested` and the scheduler sends it again (same id, so never twice); if
 * PayPal refuses it, the money goes back to the wallet.
 */
async function sendWithdrawal(w: WithdrawalRow) {
  const receiver = await receiverFor(w.member_id);
  if (!receiver) {
    await settle(w.id, "failed", "NO_PAYPAL_ON_FILE");
    return;
  }
  try {
    const payout = await sendPayout({
      id: `withdrawal-${w.id}`,
      amount: Number(w.amount),
      receiver,
      subject: "Your Unitus withdrawal",
      note: "Withdrawal from your Unitus wallet",
    });
    check(await db().from("withdrawals").update({ status: "sending", payout_batch_id: payout.batchId, payout_status: payout.status }).eq("id", w.id).eq("status", "requested"));
  } catch (error) {
    if (error instanceof PayPalUnreachable) return;
    // PayPal already has this batch: it may have been paid, so never refund it here.
    if (error instanceof PayPalError && /DUPLICATE|ALREADY_EXISTS/i.test(error.issue ?? "")) throw error;
    if (error instanceof PayPalError && error.status < 500) {
      await settle(w.id, "failed", (error.issue ?? error.message).slice(0, 200));
      return;
    }
    throw error;
  }
}

async function settle(id: string, outcome: "sent" | "failed", status: string, fee = 0, itemId?: string) {
  const { error } = await db().rpc("settle_withdrawal", { p_id: id, p_outcome: outcome, p_status: status, p_fee: fee, p_item: itemId ?? null });
  if (error) throw new Error(`Database error: ${error.message}`);
}

/** Scheduler: retries unsent withdrawals and records the ones PayPal has finished. */
export async function settleWithdrawals(log: (line: string) => void) {
  const open = check(await db().from("withdrawals").select("*").in("status", ["requested", "sending"])) as WithdrawalRow[];
  for (const w of open) {
    try {
      if (w.status === "requested") {
        await sendWithdrawal(w);
        continue;
      }
      if (!w.payout_batch_id) continue;
      const p = await checkPayout(w.payout_batch_id);
      if (p.outcome === "pending") continue;
      await settle(w.id, p.outcome, p.status, p.fee, p.itemId);
      log(`Withdrawal ${w.id.slice(0, 6)} of $${w.amount}: ${p.status}${p.outcome === "failed" ? "; returned to the wallet" : ""}`);
    } catch (error) {
      log(`Withdrawal ${w.id.slice(0, 6)}: ${(error as Error).message}`);
    }
  }
}
