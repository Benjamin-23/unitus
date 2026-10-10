// Server-only: everything the dashboard and analytics show, built from Supabase.
import type { ChamaRow } from "@/lib/chamas";
import { db } from "@/lib/db";
import { withFee } from "@/lib/fees";

type PaymentRow = {
  member_id: string;
  kind: "joining_fee" | "monthly_deduction" | "offer";
  reference: string | null;
  paypal_order_id: string;
  paypal_capture_id: string | null;
  amount: number;
  principal: number;
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
  type: "Joining fee" | "Monthly contribution";
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
  paidThisMonth: boolean;
  months: number;
  contributed: number;
  savings: number;
  /** Joining fee + savings: what's theirs in the pool. */
  balance: number;
  feesPaid: number;
};

export type ScheduleRow = { date: string; contribution: number; savings: number; fee: number; total: number; note: string };

export type MonthlyRow = { month: string; contributions: number; savings: number; joiningFees: number };

export type ChamaDashboard = {
  chama: ChamaRow;
  role: "admin" | "member";
  period: string;
  cycle: { start: string; end: string; drawsDone: number; drawsTotal: number };
  members: MemberRow[];
  ledger: LedgerRow[];
  monthly: MonthlyRow[];
  schedule: ScheduleRow[];
  pool: {
    /** Net money in the pool for this chama: what PayPal actually deposited, minus payouts. */
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
    paidThisMonth: boolean;
    feePaid: boolean;
  } | null;
  next: { date: string; contribution: number; savings: number; fee: number; total: number } | null;
};

// Unfinished checkouts (buyer never approved) aren't part of the ledger.
const SETTLED = ["COMPLETED", "PENDING", "DENIED", "REFUNDED", "DECLINED", "FAILED"];

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  return ym(new Date(Date.UTC(y, m - 1 + n, 1)));
}

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
  return [
    ...admin.map((c) => ({ ...c, role: "admin" as const })),
    ...member.filter((m) => !admin.some((a) => a.id === m.id)).map((c) => ({ ...c, role: "member" as const })),
  ];
}

export async function getChamaDashboard(chamaId: string, memberId: string, now = new Date()): Promise<ChamaDashboard | null> {
  const chama = check(await db().from("chamas").select("*").eq("id", chamaId).maybeSingle<ChamaRow>());
  if (!chama) return null;

  const memberships = check(
    await db()
      .from("chama_members")
      .select("member_id, joined_at, joining_fee_paid_at, members(full_name)")
      .eq("chama_id", chamaId)
      .order("joined_at"),
  ) as unknown as { member_id: string; joined_at: string; joining_fee_paid_at: string | null; members: { full_name: string | null } }[];

  const isAdmin = chama.created_by === memberId;
  const isMember = memberships.some((m) => m.member_id === memberId);
  // Only the chama's admin and its members can see its records.
  if (!isAdmin && !isMember) return null;

  const payments = (
    check(
      await db()
        .from("payments")
        .select("member_id, kind, reference, paypal_order_id, paypal_capture_id, amount, principal, fee_charged, paypal_fee, net_amount, status, created_at")
        .eq("chama_id", chamaId)
        .in("status", SETTLED)
        .order("created_at", { ascending: false }),
    ) as PaymentRow[]
  ).map((p) => ({
    ...p,
    amount: Number(p.amount),
    principal: Number(p.principal ?? p.amount),
    fee_charged: Number(p.fee_charged ?? 0),
    paypal_fee: p.paypal_fee === null ? null : Number(p.paypal_fee),
    net_amount: p.net_amount === null ? null : Number(p.net_amount),
  }));

  const contribution = Number(chama.monthly_contribution);
  const savingsPerMonth = Number(chama.monthly_savings);
  const period = ym(now);
  const start = chama.start_month.slice(0, 7);
  const end = addMonths(start, chama.member_limit - 1);
  const names = new Map(memberships.map((m) => [m.member_id, m.members?.full_name ?? "Member"]));
  const completed = payments.filter((p) => p.status === "COMPLETED");

  const members: MemberRow[] = memberships.map((m) => {
    const mine = completed.filter((p) => p.member_id === m.member_id && p.kind === "monthly_deduction");
    const theirs = completed.filter((p) => p.member_id === m.member_id);
    const fee = theirs.filter((p) => p.kind === "joining_fee").reduce((sum, p) => sum + p.principal, 0);
    return {
      balance: fee + mine.length * savingsPerMonth,
      feesPaid: theirs.reduce((sum, p) => sum + p.fee_charged, 0),
      name: names.get(m.member_id) ?? "Member",
      isYou: m.member_id === memberId,
      joined: m.joined_at,
      feePaid: Boolean(m.joining_fee_paid_at),
      paidThisMonth: mine.some((p) => p.reference === period),
      months: mine.length,
      contributed: mine.length * contribution,
      savings: mine.length * savingsPerMonth,
    };
  });

  const ledger: LedgerRow[] = payments
    .filter((p) => p.kind === "joining_fee" || p.kind === "monthly_deduction")
    .map((p) => ({
      date: p.created_at,
      member: names.get(p.member_id) ?? "Former member",
      isYou: p.member_id === memberId,
      type: p.kind === "joining_fee" ? "Joining fee" : "Monthly contribution",
      period: p.kind === "monthly_deduction" ? p.reference : null,
      amount: p.principal,
      fee: p.fee_charged,
      charged: p.amount,
      status: p.status,
      reference: p.paypal_capture_id ?? p.paypal_order_id,
    }));

  const fees = completed.filter((p) => p.kind === "joining_fee");
  const deductions = completed.filter((p) => p.kind === "monthly_deduction");
  const payouts = 0; // TODO(payouts): subtract payouts once the draw is built.
  const pool = {
    joiningFees: fees.reduce((s, p) => s + p.principal, 0),
    contributions: deductions.length * contribution,
    savings: deductions.length * savingsPerMonth,
    payouts,
    feesCharged: completed.reduce((s, p) => s + p.fee_charged, 0),
    paypalFees: completed.reduce((s, p) => s + (p.paypal_fee ?? 0), 0),
    // What PayPal actually deposited (net of its fee). Falls back to the principal
    // for payments captured before fee tracking existed.
    balance: Math.round((completed.reduce((s, p) => s + (p.net_amount ?? p.principal), 0) - payouts) * 100) / 100,
  };

  const monthlyMap = new Map<string, MonthlyRow>();
  for (const p of completed) {
    const month = p.kind === "monthly_deduction" && p.reference ? p.reference : p.created_at.slice(0, 7);
    const row = monthlyMap.get(month) ?? { month, contributions: 0, savings: 0, joiningFees: 0 };
    if (p.kind === "joining_fee") row.joiningFees += p.principal;
    if (p.kind === "monthly_deduction") {
      row.contributions += contribution;
      row.savings += savingsPerMonth;
    }
    monthlyMap.set(month, row);
  }
  const monthly = [...monthlyMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const meRow = members.find((m) => m.isYou);
  const myFee = fees.filter((p) => p.member_id === memberId).reduce((s, p) => s + p.principal, 0);
  const you = meRow
    ? {
        lockedJoiningFee: myFee,
        savings: meRow.savings,
        contributed: meRow.contributed,
        balance: myFee + meRow.savings,
        feesPaid: meRow.feesPaid,
        paidThisMonth: meRow.paidThisMonth,
        feePaid: meRow.feePaid,
      }
    : null;

  // Deductions run on the chama's deduction day, from the first draw month to the end of the cycle.
  const day = chama.deduction_day;
  const firstMonth = [period, start].sort()[1];
  const thisMonthDone = period >= start && (isAdmin ? false : you?.paidThisMonth);
  const passedDay = now.getUTCDate() > day && period >= start;
  let nextMonth = firstMonth === period && (thisMonthDone || passedDay) ? addMonths(period, 1) : firstMonth;
  if (nextMonth > end) nextMonth = "";
  const monthlyCharge = withFee(contribution + savingsPerMonth);
  const total = monthlyCharge.total;
  const dateOf = (month: string) => `${month}-${String(day).padStart(2, "0")}`;
  const next = nextMonth ? { date: dateOf(nextMonth), contribution, savings: savingsPerMonth, fee: monthlyCharge.fee, total } : null;

  const schedule: ScheduleRow[] = [];
  for (let m = nextMonth; m && m <= end && schedule.length < 12; m = addMonths(m, 1)) {
    const n = (Number(m.slice(0, 4)) - Number(start.slice(0, 4))) * 12 + Number(m.slice(5)) - Number(start.slice(5)) + 1;
    schedule.push({
      date: dateOf(m),
      contribution,
      savings: savingsPerMonth,
      fee: monthlyCharge.fee,
      total,
      note: n === 1 ? "First draw" : m === end ? `Final draw (${n} of ${chama.member_limit})` : `Draw ${n} of ${chama.member_limit}`,
    });
  }

  return {
    chama,
    role: isAdmin ? "admin" : "member",
    period,
    cycle: { start, end, drawsDone: 0, drawsTotal: chama.member_limit },
    members,
    ledger,
    monthly,
    schedule,
    pool,
    you,
    next,
  };
}

/** The member's merry-go-round payout (largest across their chamas), used to size partner offers. */
export async function memberPayout(memberId: string) {
  const rows = check(
    await db().from("chama_members").select("chamas(monthly_contribution, member_limit)").eq("member_id", memberId),
  ) as unknown as { chamas: { monthly_contribution: number; member_limit: number } }[];
  return rows.reduce((max, r) => Math.max(max, Number(r.chamas.monthly_contribution) * r.chamas.member_limit), 0);
}
