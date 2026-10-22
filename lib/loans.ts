// Server-only: member loans (migration 0011). A member borrows from their
// chama's savings once they've saved in LOAN_MIN_SAVING_ROUNDS rounds; the loan
// lands in their Unitus wallet and is repaid in instalments with each round.
import { db } from "@/lib/db";

// These rules are enforced in the database (loan_offer / request_loan); the
// constants here only explain them in the UI.
/** Rounds a member must have saved in before they can borrow. */
export const LOAN_MIN_SAVING_ROUNDS = 4;
/** The first loan is this share of their savings… */
export const LOAN_FIRST_PERCENT = 25;
/** …and it grows by this much for each loan repaid without missing a round. */
export const LOAN_STEP_PERCENT = 5;
export const LOAN_INSTALMENT_CHOICES = [1, 2, 3, 4, 6] as const;

export type LoanRow = {
  id: string;
  chama_id: string;
  member_id: string;
  principal: number;
  interest_rate: number;
  interest: number;
  total: number;
  instalments: number;
  instalment: number;
  repaid: number;
  status: "active" | "repaid";
  created_at: string;
  repaid_at: string | null;
};

export type LoanOffer = {
  savingRounds: number;
  /** Round payments missed since their first one (any blocks borrowing). */
  skippedRounds: number;
  /** Loans in this chama repaid without missing a round. */
  goodLoans: number;
  /** Share of their savings they can borrow: 25%, +5% per good loan. */
  limitPercent: number;
  /** Their savings in this chama. */
  savings: number;
  /** savings × limitPercent. */
  limit: number;
  /** What they can borrow now: the limit, capped by what the chama has left to lend. */
  available: number;
  /** The chama's savings and joining fees not already lent out. */
  lendable: number;
  /** They have a loan open in another chama. */
  loanElsewhere: boolean;
  eligible: boolean;
  loan: (LoanRow & { balance: number; nextInstalment: number }) | null;
  history: LoanRow[];
};

export class LoanError extends Error {}

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(`Database error: ${error.message}`);
  return data;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const toLoan = (l: LoanRow): LoanRow => ({
  ...l,
  principal: Number(l.principal),
  interest_rate: Number(l.interest_rate),
  interest: Number(l.interest),
  total: Number(l.total),
  instalment: Number(l.instalment),
  repaid: Number(l.repaid),
});

/** What's left to repay, and the next instalment (the last one may be smaller). */
export function loanDue(l: Pick<LoanRow, "total" | "repaid" | "instalment">) {
  const balance = round2(Math.max(0, l.total - l.repaid));
  return { balance, nextInstalment: Math.min(l.instalment, balance) };
}

export async function getLoanOffer(chamaId: string, memberId: string): Promise<LoanOffer> {
  const [offer, loans] = await Promise.all([
    db().rpc("loan_offer", { p_chama: chamaId, p_member: memberId }).single<{
      saving_rounds: number;
      skipped_rounds: number;
      good_loans: number;
      limit_percent: number;
      savings: number;
      limit_amount: number;
      available: number;
      lendable: number;
      active_loan: string | null;
      active_loan_chama: string | null;
    }>(),
    db().from("loans").select("*").eq("chama_id", chamaId).eq("member_id", memberId).order("created_at", { ascending: false }),
  ]);
  const o = check(offer);
  if (!o) throw new Error("Database error: no loan offer");
  const history = (check(loans) as LoanRow[]).map(toLoan);
  const active = history.find((l) => l.status === "active");
  const loanElsewhere = Boolean(o.active_loan && o.active_loan_chama !== chamaId);
  return {
    savingRounds: o.saving_rounds,
    skippedRounds: o.skipped_rounds,
    goodLoans: o.good_loans,
    limitPercent: Number(o.limit_percent),
    loanElsewhere,
    savings: Number(o.savings),
    limit: Number(o.limit_amount),
    available: Number(o.available),
    lendable: Number(o.lendable),
    eligible: o.saving_rounds >= LOAN_MIN_SAVING_ROUNDS && o.skipped_rounds === 0 && !o.active_loan && Number(o.available) > 0,
    loan: active ? { ...active, ...loanDue(active) } : null,
    history,
  };
}

/** Takes out a loan; the money is credited to the member's wallet. */
export async function takeLoan(chamaId: string, memberId: string, amount: number, instalments: number) {
  const { data, error } = await db().rpc("request_loan", {
    p_chama: chamaId,
    p_member: memberId,
    p_amount: round2(amount),
    p_instalments: instalments,
  });
  // check_violation: a rule said no, with a message for the member.
  if (error) throw new LoanError(error.code === "23514" ? error.message : "Couldn't take out the loan. Please try again.");
  return toLoan(data as LoanRow);
}

/**
 * The instalment to add to a member's payment for a round. Only loans taken
 * before the round started count, so a retried charge (same PayPal-Request-Id)
 * always asks for the same amount.
 */
export async function loanInstalmentFor(chamaId: string, memberId: string, roundCreatedAt: string) {
  const row = check(
    await db()
      .from("loans")
      .select("*")
      .eq("chama_id", chamaId)
      .eq("member_id", memberId)
      .eq("status", "active")
      .lt("created_at", roundCreatedAt)
      .maybeSingle<LoanRow>(),
  );
  if (!row) return null;
  const loan = toLoan(row);
  const { nextInstalment } = loanDue(loan);
  return nextInstalment > 0 ? { loanId: loan.id, amount: nextInstalment } : null;
}
