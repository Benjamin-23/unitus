// Server-only chama data access (Supabase, secret key). Never import from "use client" files.
import { validateRules, type GroupRules } from "@/lib/chama";
import { db } from "@/lib/db";
import { withFee, type Charge } from "@/lib/fees";

export type ChamaRow = {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  member_limit: number;
  start_month: string;
  currency: string;
  monthly_contribution: number;
  monthly_savings: number;
  joining_fee: number;
  deduction_day: number;
  share_out: "mid-year" | "year-end";
  loan_multiplier: number;
  loan_interest_rate: number;
  status: "open" | "active" | "closed";
  created_at: string;
};

/** What a prospective member sees before joining. */
export type ChamaPreview = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  createdBy: string | null;
  memberCount: number;
  memberLimit: number;
  startMonth: string;
  status: ChamaRow["status"];
  rules: {
    monthlyContribution: number;
    monthlySavings: number;
    joiningFee: number;
    deductionDay: number;
    shareOut: ChamaRow["share_out"];
    loanMultiplier: number;
    loanInterestRate: number;
  };
  /** What PayPal will charge a member, with the PayPal fee they pay on top. */
  charges: { joiningFee: Charge; monthly: Charge };
  /**
   * The viewer's relationship to the chama. The creator is "admin" only: never a
   * member, never pays, never receives payouts (see migration 0003).
   */
  you?: { role: "admin" } | { role: "member"; joiningFeePaid: boolean };
};

export class ChamaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// No 0/O or 1/I, so codes survive being read out over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

export function normaliseInviteCode(code: string) {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : null;
}

export type CreateChamaInput = Omit<GroupRules, "currency"> & { startMonth: string; description?: string };

export async function createChama(memberId: string, input: CreateChamaInput) {
  const errors = validateRules({ ...input, currency: "USD" });
  const firstError = Object.values(errors)[0];
  if (firstError) throw new ChamaError(firstError, 400);
  if (!/^\d{4}-\d{2}$/.test(input.startMonth)) throw new ChamaError("Choose the month of the first draw.", 400);
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (input.startMonth < thisMonth) throw new ChamaError("The first draw can't be in the past.", 400);

  const rules = {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    memberLimit: input.memberCount,
    startMonth: `${input.startMonth}-01`,
    monthlyContribution: input.monthlyContribution,
    monthlySavings: input.monthlySavings,
    joiningFee: input.joiningFee,
    deductionDay: input.deductionDay,
    shareOut: input.shareOut,
    loanMultiplier: input.loanMultiplier,
    loanInterestRate: input.loanInterestRate,
  };

  // Invite codes are random; retry on the rare collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db().rpc("create_chama", { p_member: memberId, p_invite_code: newInviteCode(), p_rules: rules });
    if (!error) return data as ChamaRow;
    if (/takes part in a chama/i.test(error.message)) throw new ChamaError(error.message + ".", 409);
    if (!error.message.includes("invite_code")) throw new Error(`Database error: ${error.message}`);
  }
  throw new Error("Could not generate a unique invite code");
}

async function memberCount(chamaId: string) {
  const { count, error } = await db().from("chama_members").select("*", { count: "exact", head: true }).eq("chama_id", chamaId);
  if (error) throw new Error(`Database error: ${error.message}`);
  return count ?? 0;
}

async function toPreview(c: ChamaRow, memberId?: string): Promise<ChamaPreview> {
  const [count, creator, you] = await Promise.all([
    memberCount(c.id),
    db().from("members").select("full_name").eq("id", c.created_by).maybeSingle<{ full_name: string | null }>(),
    memberId
      ? db()
          .from("chama_members")
          .select("role, joining_fee_paid_at")
          .eq("chama_id", c.id)
          .eq("member_id", memberId)
          .maybeSingle<{ role: "admin" | "member"; joining_fee_paid_at: string | null }>()
      : Promise.resolve({ data: null }),
  ]);
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    inviteCode: c.invite_code,
    createdBy: creator.data?.full_name ?? null,
    memberCount: count,
    memberLimit: c.member_limit,
    startMonth: c.start_month.slice(0, 7),
    status: c.status,
    rules: {
      monthlyContribution: Number(c.monthly_contribution),
      monthlySavings: Number(c.monthly_savings),
      joiningFee: Number(c.joining_fee),
      deductionDay: c.deduction_day,
      shareOut: c.share_out,
      loanMultiplier: c.loan_multiplier,
      loanInterestRate: Number(c.loan_interest_rate),
    },
    charges: {
      joiningFee: withFee(Number(c.joining_fee)),
      monthly: withFee(Number(c.monthly_contribution) + Number(c.monthly_savings)),
    },
    you:
      memberId && c.created_by === memberId
        ? { role: "admin" }
        : you.data
          ? { role: "member", joiningFeePaid: Boolean(you.data.joining_fee_paid_at) }
          : undefined,
  };
}

export async function getChamaByCode(code: string, memberId?: string) {
  const normalised = normaliseInviteCode(code);
  if (!normalised) throw new ChamaError("Invite codes look like K7QM-3XPA.", 400);
  const { data, error } = await db().from("chamas").select("*").eq("invite_code", normalised).maybeSingle<ChamaRow>();
  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data) throw new ChamaError("We couldn't find a chama with that code. Check it with whoever shared it.", 404);
  return toPreview(data, memberId);
}

export async function getChamaRow(chamaId: string) {
  const { data, error } = await db().from("chamas").select("*").eq("id", chamaId).maybeSingle<ChamaRow>();
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

export async function joinChama(memberId: string, code: string) {
  const normalised = normaliseInviteCode(code);
  if (!normalised) throw new ChamaError("Invite codes look like K7QM-3XPA.", 400);
  const { data, error } = await db().rpc("join_chama", { p_member: memberId, p_invite_code: normalised });
  if (error) {
    if (/no chama|full|no longer accepting|admin account/i.test(error.message)) throw new ChamaError(error.message + ".", 409);
    throw new Error(`Database error: ${error.message}`);
  }
  const row = (data as { chama_id: string; already_member: boolean }[])[0];
  return { chamaId: row.chama_id, alreadyMember: row.already_member };
}

export async function getMembership(chamaId: string, memberId: string) {
  const { data, error } = await db()
    .from("chama_members")
    .select("role, joining_fee_paid_at")
    .eq("chama_id", chamaId)
    .eq("member_id", memberId)
    .maybeSingle<{ role: "admin" | "member"; joining_fee_paid_at: string | null }>();
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

export async function markJoiningFeePaid(chamaId: string, memberId: string) {
  const { error } = await db()
    .from("chama_members")
    .update({ joining_fee_paid_at: new Date().toISOString() })
    .eq("chama_id", chamaId)
    .eq("member_id", memberId);
  if (error) throw new Error(`Database error: ${error.message}`);
}

export async function listMyChamas(memberId: string) {
  const [created, joined] = await Promise.all([
    db().from("chamas").select("*").eq("created_by", memberId).order("created_at", { ascending: false }),
    db().from("chama_members").select("chamas(*)").eq("member_id", memberId).order("joined_at", { ascending: false }),
  ]);
  if (created.error) throw new Error(`Database error: ${created.error.message}`);
  if (joined.error) throw new Error(`Database error: ${joined.error.message}`);
  const rows = [...((created.data ?? []) as ChamaRow[]), ...((joined.data ?? []) as unknown as { chamas: ChamaRow }[]).map((r) => r.chamas)];
  const unique = [...new Map(rows.map((c) => [c.id, c])).values()];
  return Promise.all(unique.map((c) => toPreview(c, memberId)));
}

export function chamaErrorResponse(error: unknown) {
  if (error instanceof ChamaError) return Response.json({ error: error.message }, { status: error.status });
  console.error("[chamas]", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

/** Chamas where the member has paid the joining fee, so monthly deductions apply. */
export async function listChargeableChamas(memberId: string) {
  const { data, error } = await db()
    .from("chama_members")
    .select("chamas(id, name, monthly_contribution, monthly_savings, status)")
    .eq("member_id", memberId)
    .not("joining_fee_paid_at", "is", null);
  if (error) throw new Error(`Database error: ${error.message}`);
  const rows = (data ?? []) as unknown as { chamas: Pick<ChamaRow, "id" | "name" | "monthly_contribution" | "monthly_savings" | "status"> }[];
  return rows
    .filter((r) => r.chamas.status !== "closed")
    .map((r) => ({
      id: r.chamas.id,
      name: r.chamas.name,
      monthlyContribution: Number(r.chamas.monthly_contribution),
      monthlySavings: Number(r.chamas.monthly_savings),
    }));
}

/**
 * Admin and member accounts are separate: an account that is a member of any
 * chama, or has paid into one, can't create a chama (enforced in the database too).
 */
export async function canCreateChama(memberId: string) {
  const { data, error } = await db().rpc("can_create_chama", { p_member: memberId });
  if (error) throw new Error(`Database error: ${error.message}`);
  return data === true;
}
