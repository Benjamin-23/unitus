// Server-only: the Unitus main wallet (operator view across all chamas).
import { db } from "@/lib/db";
import { paypalRequest } from "@/lib/paypal/server";

export type WalletChama = {
  id: string;
  name: string;
  accountNumber: string;
  status: "open" | "active" | "closed";
  members: number;
  memberLimit: number;
  balance: number;
  createdAt: string;
};

export type WalletTransaction = {
  date: string;
  chama: string;
  accountNumber: string;
  type: string;
  member: string | null;
  /** What PayPal charged the member. */
  gross: number | null;
  paypalFee: number | null;
  /** Net that reached the pool (debit to UNT-POOL). */
  toPool: number;
  /** Credited to the chama's accounts. */
  toChama: number;
  /** Covered by (negative) or earned by (positive) Unitus. */
  unitus: number;
};

export type Wallet = {
  ledger: { pool: number; operating: number; heldForChamas: number };
  paypal: { balance: number | null; available: number | null; asOf: string | null; error: string | null };
  chamas: WalletChama[];
  counts: { chamas: number; open: number; active: number; closed: number; members: number };
  fees: { chargedToMembers: number; takenByPayPal: number };
  transactions: WalletTransaction[];
};

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The pool account's real balance at PayPal (Balances API). */
async function paypalBalance(): Promise<Wallet["paypal"]> {
  try {
    const data = await paypalRequest<{
      as_of_time: string;
      balances: { currency: string; total_balance: { value: string }; available_balance: { value: string } }[];
    }>("/v1/reporting/balances?currency_code=USD", { method: "GET" });
    const usd = data.balances?.find((b) => b.currency === "USD");
    return {
      balance: usd ? Number(usd.total_balance.value) : 0,
      available: usd ? Number(usd.available_balance.value) : 0,
      asOf: data.as_of_time,
      error: null,
    };
  } catch (e) {
    return { balance: null, available: null, asOf: null, error: (e as Error).message };
  }
}

export async function getWallet(): Promise<Wallet> {
  const [balances, chamaRows, memberships, txRows, entries, paypal] = await Promise.all([
    db().from("ledger_balances").select("kind, chama_id, balance"),
    db().from("chamas").select("id, name, invite_code, status, member_limit, created_at").order("created_at", { ascending: false }),
    db().from("chama_members").select("chama_id"),
    db()
      .from("ledger_transactions")
      .select("id, chama_id, kind, description, gross_amount, fee_charged, paypal_fee, occurred_at, members(full_name)")
      .order("occurred_at", { ascending: false })
      .limit(500),
    db().from("ledger_entries").select("transaction_id, amount, ledger_accounts(kind)"),
    paypalBalance(),
  ]);

  const accounts = (check(balances) as { kind: string; chama_id: string | null; balance: number }[]).map((a) => ({ ...a, balance: Number(a.balance) }));
  const chamaList = check(chamaRows) as { id: string; name: string; invite_code: string; status: WalletChama["status"]; member_limit: number; created_at: string }[];
  const members = check(memberships) as { chama_id: string }[];

  const sumWhere = (pred: (a: (typeof accounts)[number]) => boolean) => round(accounts.filter(pred).reduce((s, a) => s + a.balance, 0));
  const ledger = {
    pool: sumWhere((a) => a.kind === "paypal_pool"),
    operating: sumWhere((a) => a.kind === "unitus_operating"),
    heldForChamas: sumWhere((a) => a.chama_id !== null),
  };

  const chamas: WalletChama[] = chamaList.map((c) => ({
    id: c.id,
    name: c.name,
    accountNumber: `UNT-${c.invite_code}`,
    status: c.status,
    members: members.filter((m) => m.chama_id === c.id).length,
    memberLimit: c.member_limit,
    balance: sumWhere((a) => a.chama_id === c.id),
    createdAt: c.created_at,
  }));
  const names = new Map(chamaList.map((c) => [c.id, c]));

  // Split each transaction's entries by account type.
  const byTx = new Map<string, { pool: number; chama: number; unitus: number }>();
  for (const e of check(entries) as unknown as { transaction_id: string; amount: number; ledger_accounts: { kind: string } }[]) {
    const t = byTx.get(e.transaction_id) ?? { pool: 0, chama: 0, unitus: 0 };
    const amount = Number(e.amount);
    if (e.ledger_accounts.kind === "paypal_pool") t.pool += amount;
    else if (e.ledger_accounts.kind === "unitus_operating") t.unitus -= amount; // credit-normal: a debit is money Unitus covered
    else t.chama -= amount;
    byTx.set(e.transaction_id, t);
  }

  const txs = check(txRows) as unknown as {
    id: string;
    chama_id: string | null;
    kind: string;
    description: string;
    gross_amount: number | null;
    fee_charged: number | null;
    paypal_fee: number | null;
    occurred_at: string;
    members: { full_name: string | null } | null;
  }[];

  const transactions: WalletTransaction[] = txs.map((t) => {
    const parts = byTx.get(t.id) ?? { pool: 0, chama: 0, unitus: 0 };
    const chama = t.chama_id ? names.get(t.chama_id) : undefined;
    return {
      date: t.occurred_at,
      chama: chama?.name ?? "—",
      accountNumber: chama ? `UNT-${chama.invite_code}` : "—",
      type: t.description,
      member: t.members?.full_name ?? null,
      gross: t.gross_amount === null ? null : Number(t.gross_amount),
      paypalFee: t.paypal_fee === null ? null : Number(t.paypal_fee),
      toPool: round(parts.pool),
      toChama: round(parts.chama),
      unitus: round(parts.unitus),
    };
  });

  return {
    ledger,
    paypal,
    chamas,
    counts: {
      chamas: chamas.length,
      open: chamas.filter((c) => c.status === "open").length,
      active: chamas.filter((c) => c.status === "active").length,
      closed: chamas.filter((c) => c.status === "closed").length,
      members: members.length,
    },
    fees: {
      chargedToMembers: round(txs.reduce((s, t) => s + Number(t.fee_charged ?? 0), 0)),
      takenByPayPal: round(txs.reduce((s, t) => s + Number(t.paypal_fee ?? 0), 0)),
    },
    transactions,
  };
}
