// Server-only: everything the dashboard and analytics show, built from Supabase.
import type { ChamaRow } from "@/lib/chamas";
import { db } from "@/lib/db";
import { withFee } from "@/lib/fees";
import { chamaAccountNumber, chamaAccounts, chamaStatement, type LedgerAccount, type StatementRow } from "@/lib/ledger";
import { listRounds, MIN_MEMBERS_TO_RUN, nextRoundDue, type RoundStatus } from "@/lib/rounds";
import { addRounds, isFrequency, type Frequency } from "@/lib/schedule";

type PaymentRow = {
  member_id: string;
  kind: "joining_fee" | "monthly_deduction" | "offer";
  reference: string | null;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  amount: number;
  principal: number;
  contribution: number | null;
  fee_charged: number;
  paypal_fee: number | null;
  net_amount: number | null;
  status: string;
  created_at: string;
};

export type LedgerRow = {
  date: string;
  member: string;
  isYou: boolean;
  type: "Joining fee" | "Contribution" | "Savings only";
  /** "Round 3", for scheduled deductions. */
  period: string | null;
  /** What belongs to the chama (credited to the member). */
  amount: number;
  /** PayPal fee the member paid on top. */
  fee: number;
  /** What PayPal charged the member. */
  charged: number;
  status: string;
  reference: string;
};

export type MemberRow = {
  name: string;
  isYou: boolean;
  joined: string;
  feePaid: boolean;
  /** Paid into the most recent round (or wasn't due to). */
  paidLastRound: boolean;
  /** Has received the pot in the current cycle. */
  receivedThisCycle: boolean;
  /** Rounds they've paid into. */
  rounds: number;
  contributed: number;
  savings: number;
  /** Joining fee + savings: what's theirs in the pool. */
  balance: number;
  feesPaid: number;
  /** ISO code from PayPal (e.g. KE), or null until they've paid. */
  countryCode: string | null;
  /** Country name, e.g. "Kenya", or "Unknown". */
  country: string;
};

export type ScheduleRow = { date: string; contribution: number; savings: number; fee: number; total: number; note: string };

export type RoundView = {
  number: number;
  cycle: number;
  dueAt: string;
  recipient: string;
  isYou: boolean;
  pot: number | null;
  status: RoundStatus;
  payoutStatus: string | null;
  payoutFee: number | null;
  completedAt: string | null;
};

/** Money in per round (analytics). `month` holds the round label, e.g. "Round 3". */
export type MonthlyRow = { month: string; contributions: number; savings: number; joiningFees: number };

export type ChamaDashboard = {
  chama: ChamaRow;
  frequency: Frequency;
  /** "member" when the viewer has joined (a creator can too); "admin" for a creator who hasn't. */
  role: "admin" | "member";
  /** The viewer created this chama (admin rights: invites and records, never money). */
  isCreator: boolean;
  /** Members who've paid the joining fee (they take part in rounds). */
  activeMembers: number;
  cycle: { number: number; roundsDone: number; received: number; members: number };
  rounds: RoundView[];
  members: MemberRow[];
  ledger: LedgerRow[];
  monthly: MonthlyRow[];
  schedule: ScheduleRow[];
  pool: {
    /** Net money in the pool for this chama. */
    balance: number;
    joiningFees: number;
    contributions: number;
    savings: number;
    payouts: number;
    /** Fees members paid on top, and what PayPal actually took. */
    feesCharged: number;
    paypalFees: number;
  };
  you: {
    lockedJoiningFee: number;
    savings: number;
    contributed: number;
    balance: number;
    feesPaid: number;
    paidLastRound: boolean;
    receivedThisCycle: boolean;
    received: number;
    feePaid: boolean;
  } | null;
  /** The next round. `waiting` when there aren't enough paid members yet. */
  next: {
    date: string;
    number: number;
    waiting: boolean;
    contribution: number;
    savings: number;
    fee: number;
    total: number;
    /** What you pay if you're the one drawn: savings only. */
    ifDrawn: number;
  } | null;
  /** The chama's account inside Unitus. */
  account: {
    number: string;
    /** True when balances come from the double-entry ledger (migration 0006). */
    fromLedger: boolean;
    pot: number;
    accounts: Pick<LedgerAccount, "number" | "name" | "kind" | "balance">[];
    statement: StatementRow[];
  };
};

/** Ledger accounts and statement, or null if the ledger isn't set up yet (migration 0006). */
async function loadLedger(chamaId: string, viewerId: string) {
  try {
    const [accounts, statement] = await Promise.all([chamaAccounts(chamaId), chamaStatement(chamaId, viewerId)]);
    return { accounts, statement };
  } catch (error) {
    console.warn("[ledger] not available, falling back to payment totals:", (error as Error).message);
    return null;
  }
}

// Unfinished checkouts (buyer never approved) aren't part of the ledger.
const SETTLED = ["COMPLETED", "PENDING", "DENIED", "REFUNDED", "DECLINED", "FAILED"];

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function monthName(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Chamas the member can see on the dashboard: ones they administer and ones they belong to. */
export async function listDashboardChamas(memberId: string) {
  const [created, joined] = await Promise.all([
    db().from("chamas").select("id, name").eq("created_by", memberId).order("created_at", { ascending: false }),
    db().from("chama_members").select("chamas(id, name)").eq("member_id", memberId).order("joined_at", { ascending: false }),
  ]);
  const admin = check(created) as { id: string; name: string }[];
  const member = (check(joined) as unknown as { chamas: { id: string; name: string } }[]).map((r) => r.chamas);
  // A creator can also be a member: list each chama once, with both labels.
  const byId = new Map<string, { id: string; name: string; label: string }>();
  for (const c of member) byId.set(c.id, { ...c, label: "Member" });
  for (const c of admin) byId.set(c.id, { ...c, label: byId.has(c.id) ? "Admin · Member" : "Admin" });
  return [...byId.values()];
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/** "KE" → "Kenya". Unknown or missing codes → "Unknown". */
export function countryName(code: string | null | undefined) {
  if (!code) return "Unknown";
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export async function getChamaDashboard(chamaId: string, memberId: string, now = new Date()): Promise<ChamaDashboard | null> {
  const chama = check(await db().from("chamas").select("*").eq("id", chamaId).maybeSingle<ChamaRow>());
  if (!chama) return null;
  const frequency: Frequency = isFrequency(chama.frequency) ? chama.frequency : "monthly";

  const memberships = check(
    await db()
      .from("chama_members")
      .select("member_id, joined_at, joining_fee_paid_at, members(full_name, country)")
      .eq("chama_id", chamaId)
      .order("joined_at"),
  ) as unknown as {
    member_id: string;
    joined_at: string;
    joining_fee_paid_at: string | null;
    members: { full_name: string | null; country: string | null };
  }[];

  const isAdmin = chama.created_by === memberId;
  const isMember = memberships.some((m) => m.member_id === memberId);
  // Only the chama's admin and its members can see its records.
  if (!isAdmin && !isMember) return null;

  const [paymentRows, roundRows, books] = await Promise.all([
    db()
      .from("payments")
      .select("member_id, kind, reference, paypal_order_id, paypal_capture_id, amount, principal, contribution, fee_charged, paypal_fee, net_amount, status, created_at")
      .eq("chama_id", chamaId)
      .in("status", SETTLED)
      .order("created_at", { ascending: false }),
    listRounds(chamaId),
    loadLedger(chamaId, memberId),
  ]);
  const payments = (check(paymentRows) as PaymentRow[]).map((p) => ({
    ...p,
    amount: Number(p.amount),
    principal: Number(p.principal ?? p.amount),
    contribution: p.kind === "monthly_deduction" ? Number(p.contribution ?? Math.min(Number(chama.monthly_contribution), Number(p.principal))) : 0,
    fee_charged: Number(p.fee_charged ?? 0),
    paypal_fee: p.paypal_fee === null ? null : Number(p.paypal_fee),
    net_amount: p.net_amount === null ? null : Number(p.net_amount),
  }));

  const names = new Map(memberships.map((m) => [m.member_id, m.members?.full_name ?? "Member"]));
  const completed = payments.filter((p) => p.status === "COMPLETED");
  const deductions = completed.filter((p) => p.kind === "monthly_deduction");
  const contribution = Number(chama.monthly_contribution);
  const savingsPerRound = Number(chama.monthly_savings);

  // Rounds and cycle progress.
  const last = roundRows.at(-1);
  const cycleNumber = last?.cycle ?? 1;
  const cycleRounds = roundRows.filter((r) => r.cycle === cycleNumber);
  const receivedThisCycle = new Set(cycleRounds.map((r) => r.recipient_id));
  const active = memberships.filter((m) => m.joining_fee_paid_at);
  const lastRoundLabel = last ? `Round ${last.number}` : null;

  const members: MemberRow[] = memberships.map((m) => {
    const mine = deductions.filter((p) => p.member_id === m.member_id);
    const theirs = completed.filter((p) => p.member_id === m.member_id);
    const fee = theirs.filter((p) => p.kind === "joining_fee").reduce((sum, p) => sum + p.principal, 0);
    const contributed = mine.reduce((s, p) => s + p.contribution, 0);
    const saved = mine.reduce((s, p) => s + p.principal - p.contribution, 0);
    const ledgerBalance = books?.accounts.filter((a) => a.member_id === m.member_id).reduce((sum, a) => sum + a.balance, 0);
    return {
      name: names.get(m.member_id) ?? "Member",
      isYou: m.member_id === memberId,
      joined: m.joined_at,
      feePaid: Boolean(m.joining_fee_paid_at),
      paidLastRound: !lastRoundLabel || mine.some((p) => p.reference === lastRoundLabel),
      receivedThisCycle: receivedThisCycle.has(m.member_id),
      rounds: mine.length,
      contributed: round2(contributed),
      savings: round2(saved),
      balance: round2(ledgerBalance ?? fee + saved),
      feesPaid: round2(theirs.reduce((sum, p) => sum + p.fee_charged, 0)),
      countryCode: m.members?.country ?? null,
      country: countryName(m.members?.country),
    };
  });

  const rounds: RoundView[] = roundRows
    .map((r) => ({
      number: r.number,
      cycle: r.cycle,
      dueAt: r.due_at,
      recipient: names.get(r.recipient_id) ?? "Former member",
      isYou: r.recipient_id === memberId,
      pot: r.pot === null ? null : Number(r.pot),
      status: r.status,
      payoutStatus: r.payout_status,
      payoutFee: r.payout_fee === null ? null : Number(r.payout_fee),
      completedAt: r.completed_at,
    }))
    .reverse();

  const ledger: LedgerRow[] = payments
    .filter((p) => p.kind === "joining_fee" || p.kind === "monthly_deduction")
    .map((p) => ({
      date: p.created_at,
      member: names.get(p.member_id) ?? "Former member",
      isYou: p.member_id === memberId,
      type: p.kind === "joining_fee" ? "Joining fee" : p.contribution > 0 ? "Contribution" : "Savings only",
      period: p.kind === "monthly_deduction" ? p.reference : null,
      amount: p.principal,
      fee: p.fee_charged,
      charged: p.amount,
      status: p.status,
      reference: p.paypal_capture_id ?? p.paypal_order_id,
    }));

  const fees = completed.filter((p) => p.kind === "joining_fee");
  const payouts = roundRows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.pot ?? 0), 0);
  const pool = {
    joiningFees: round2(fees.reduce((s, p) => s + p.principal, 0)),
    contributions: round2(deductions.reduce((s, p) => s + p.contribution, 0)),
    savings: round2(deductions.reduce((s, p) => s + p.principal - p.contribution, 0)),
    payouts: round2(payouts),
    feesCharged: round2(completed.reduce((s, p) => s + p.fee_charged, 0)),
    paypalFees: round2(completed.reduce((s, p) => s + (p.paypal_fee ?? 0), 0)),
    balance: round2(completed.reduce((s, p) => s + (p.net_amount ?? p.principal), 0) - payouts),
  };
  // With the ledger, the chama's balance is what its Unitus accounts hold.
  if (books) pool.balance = round2(books.accounts.reduce((sum, a) => sum + a.balance, 0));

  // Money in per round, for analytics.
  const byRound = new Map<string, MonthlyRow>();
  for (const p of [...completed].reverse()) {
    const label = p.kind === "monthly_deduction" ? (p.reference ?? "Round") : "Joining";
    const row = byRound.get(label) ?? { month: label, contributions: 0, savings: 0, joiningFees: 0 };
    if (p.kind === "joining_fee") row.joiningFees += p.principal;
    if (p.kind === "monthly_deduction") {
      row.contributions += p.contribution;
      row.savings += p.principal - p.contribution;
    }
    byRound.set(label, row);
  }
  const monthly = [...byRound.values()];

  const meRow = members.find((m) => m.isYou);
  const myFee = fees.filter((p) => p.member_id === memberId).reduce((s, p) => s + p.principal, 0);
  const you = meRow
    ? {
        lockedJoiningFee: myFee,
        savings: meRow.savings,
        contributed: meRow.contributed,
        balance: meRow.balance,
        feesPaid: meRow.feesPaid,
        paidLastRound: meRow.paidLastRound,
        receivedThisCycle: meRow.receivedThisCycle,
        received: roundRows.filter((r) => r.recipient_id === memberId && r.status === "paid").length,
        feePaid: meRow.feePaid,
      }
    : null;

  // The next rounds, from when the next one is due.
  const due = chama.status === "closed" ? null : nextRoundDue(chama, roundRows, now);
  const charge = withFee(contribution + savingsPerRound);
  const nextNumber = (last?.number ?? 0) + 1;
  const next = due
    ? {
        date: due.toISOString(),
        number: nextNumber,
        waiting: active.length < MIN_MEMBERS_TO_RUN,
        contribution,
        savings: savingsPerRound,
        fee: charge.fee,
        total: charge.total,
        ifDrawn: savingsPerRound > 0 ? withFee(savingsPerRound).total : 0,
      }
    : null;
  const schedule: ScheduleRow[] = due
    ? Array.from({ length: 8 }, (_, i) => ({
        date: addRounds(due, frequency, i).toISOString(),
        contribution,
        savings: savingsPerRound,
        fee: charge.fee,
        total: charge.total,
        note: `Round ${nextNumber + i}${i === 0 && active.length < MIN_MEMBERS_TO_RUN ? ` (waits for ${MIN_MEMBERS_TO_RUN} paid members)` : ""}`,
      }))
    : [];

  return {
    chama,
    frequency,
    role: isMember ? "member" : "admin",
    isCreator: isAdmin,
    activeMembers: active.length,
    cycle: {
      number: cycleNumber,
      roundsDone: cycleRounds.length,
      received: receivedThisCycle.size,
      members: Math.max(active.length, receivedThisCycle.size),
    },
    rounds,
    members,
    ledger,
    monthly,
    schedule,
    pool,
    you,
    next,
    account: {
      number: chamaAccountNumber(chama.invite_code),
      fromLedger: Boolean(books),
      pot: books?.accounts.find((a) => a.kind === "chama_pot")?.balance ?? pool.contributions - pool.payouts,
      accounts: (books?.accounts ?? []).map(({ number, name, kind, balance }) => ({ number, name, kind, balance })),
      statement: books?.statement ?? [],
    },
  };
}

/** The member's merry-go-round payout (largest across their chamas, when full), used to size partner offers. */
export async function memberPayout(memberId: string) {
  const rows = check(
    await db().from("chama_members").select("chamas(monthly_contribution, member_limit)").eq("member_id", memberId),
  ) as unknown as { chamas: { monthly_contribution: number; member_limit: number } }[];
  return rows.reduce((max, r) => Math.max(max, Number(r.chamas.monthly_contribution) * (r.chamas.member_limit - 1)), 0);
}
