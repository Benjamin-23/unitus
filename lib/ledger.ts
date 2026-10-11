// Server-only: the double-entry ledger behind chama accounts (migration 0006).
import { db } from "@/lib/db";

export type AccountKind = "paypal_pool" | "unitus_operating" | "chama_pot" | "member_savings" | "member_joining_fee";

export type LedgerAccount = {
  id: string;
  number: string;
  name: string;
  kind: AccountKind;
  chama_id: string | null;
  member_id: string | null;
  balance: number;
};

export type StatementRow = {
  date: string;
  description: string;
  member: string | null;
  isYou: boolean;
  account: string;
  accountNumber: string;
  /** Money credited to this chama's accounts in this entry. */
  amount: number;
  /** The chama's total balance after this entry. */
  balance: number;
  paypalFee: number | null;
};

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

/** The chama's account number, e.g. UNT-7K2Q-3XPA. */
export const chamaAccountNumber = (inviteCode: string) => `UNT-${inviteCode}`;

/** Posts a completed payment to the ledger. Safe to call more than once. */
export async function postPayment(orderId: string) {
  const { error } = await db().rpc("ledger_post_payment", { p_order_id: orderId });
  if (error) {
    // The payment itself succeeded and is recorded; a posting failure must be
    // visible but must not fail the member's request. Re-posting is idempotent.
    console.error(`[ledger] could not post payment ${orderId}: ${error.message}`);
  }
}

/** Every account belonging to a chama, with balances. */
export async function chamaAccounts(chamaId: string) {
  const rows = check(await db().from("ledger_balances").select("*").eq("chama_id", chamaId)) as LedgerAccount[];
  return rows.map((r) => ({ ...r, balance: Number(r.balance) }));
}

/** A chama's statement: every entry to its accounts, oldest first, with a running total. */
export async function chamaStatement(chamaId: string, viewerId: string): Promise<StatementRow[]> {
  const accounts = await chamaAccounts(chamaId);
  if (accounts.length === 0) return [];
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const entries = check(
    await db()
      .from("ledger_entries")
      .select("amount, account_id, ledger_transactions!inner(occurred_at, description, member_id, paypal_fee, members(full_name))")
      .in(
        "account_id",
        accounts.map((a) => a.id),
      ),
  ) as unknown as {
    amount: number;
    account_id: string;
    ledger_transactions: {
      occurred_at: string;
      description: string;
      member_id: string | null;
      paypal_fee: number | null;
      members: { full_name: string | null } | null;
    };
  }[];

  const sorted = entries.sort((a, b) => a.ledger_transactions.occurred_at.localeCompare(b.ledger_transactions.occurred_at));
  let running = 0;
  return sorted.map((e) => {
    const account = byId.get(e.account_id)!;
    // Chama accounts are credit-normal: a credit (negative amount) increases them.
    const amount = -Number(e.amount);
    running = Math.round((running + amount) * 100) / 100;
    const tx = e.ledger_transactions;
    return {
      date: tx.occurred_at,
      description: tx.description,
      member: tx.members?.full_name ?? null,
      isYou: tx.member_id === viewerId,
      account: account.name,
      accountNumber: account.number,
      amount,
      balance: running,
      paypalFee: tx.paypal_fee === null ? null : Number(tx.paypal_fee),
    };
  });
}
