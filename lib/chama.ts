// Domain rules for a Unitus chama. Pure functions so the same logic can run
// in the UI today and on the server once the backend exists.

export type ShareOut = "mid-year" | "year-end";

export type Group = {
  id: string;
  name: string;
  inviteCode: string;
  currency: "USD";
  /** Paid once on joining. Verifies the member's PayPal and is locked in their savings until they leave. */
  joiningFee: number;
  monthlyContribution: number;
  monthlySavings: number;
  loanMultiplier: number;
  /** Flat interest on a loan, as a percentage. */
  loanInterestRate: number;
  shareOut: ShareOut;
  /** Day of the month auto-deductions run. */
  deductionDay: number;
  memberCount: number;
  cycle: { startMonth: string; endMonth: string; drawsCompleted: number };
};

export type Loan = {
  principal: number;
  interestRate: number;
  months: number;
  instalmentsPaid: number;
  disbursedOn: string;
};

export type MemberAccount = {
  savings: number;
  lockedJoiningFee: number;
  loan: Loan | null;
  hasReceivedPayout: boolean;
};

/** Whole amounts without cents ($100), anything else with both cent digits ($156.40). */
export const money = (n: number, currency = "USD") => {
  const whole = Math.round(n * 100) % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n);
};

export function loanTotal(loan: Loan) {
  return loan.principal * (1 + loan.interestRate / 100);
}

export function loanInstalment(loan: Loan) {
  return loanTotal(loan) / loan.months;
}

export function loanBalance(loan: Loan | null) {
  if (!loan) return 0;
  return Math.max(0, loanTotal(loan) - loanInstalment(loan) * loan.instalmentsPaid);
}

/** Savings count towards the loan limit, including the locked joining fee. */
export function loanLimit(group: Group, account: MemberAccount) {
  const limit = (account.savings + account.lockedJoiningFee) * group.loanMultiplier;
  return { limit, available: Math.max(0, limit - loanBalance(account.loan)) };
}

/** What gets taken from the member's PayPal on the deduction day. */
export function monthlyDeduction(group: Group, account: MemberAccount) {
  const loanRepayment = account.loan && loanBalance(account.loan) > 0 ? loanInstalment(account.loan) : 0;
  return {
    contribution: group.monthlyContribution,
    savings: group.monthlySavings,
    loanRepayment,
    total: group.monthlyContribution + group.monthlySavings + loanRepayment,
  };
}

/**
 * A member may only leave once the current merry-go-round cycle has gone all
 * the way round, so nobody walks away after collecting the pot before paying
 * into everyone else's. Any loan balance is settled from their savings.
 */
export function exitStatus(group: Group, account: MemberAccount) {
  const drawsRemaining = group.memberCount - group.cycle.drawsCompleted;
  const balance = loanBalance(account.loan);
  const gross = account.savings + account.lockedJoiningFee;
  return {
    allowed: drawsRemaining === 0,
    drawsRemaining,
    cycleEnds: group.cycle.endMonth,
    settlement: {
      savings: account.savings,
      joiningFee: account.lockedJoiningFee,
      loanDeducted: balance,
      payout: Math.max(0, gross - balance),
    },
  };
}

// ---------------------------------------------------------------------------
// Group lifecycle
//
// Once a chama is created its rules are frozen: nobody (including admins) can
// edit them, and nobody can withdraw from the group's PayPal account. Money
// only leaves through automatic payouts the rules already define.

export type GroupRules = Omit<Group, "id" | "inviteCode" | "cycle">;

/** The only ways money ever leaves the chama account. */
export const AUTOMATIC_PAYOUTS = [
  "Monthly merry-go-round payout to the drawn member",
  "Savings share-out on the agreed date",
  "Approved member loans",
  "A leaving member's savings and joining fee, after the cycle ends",
] as const;

export type GroupSnapshot = {
  memberCount: number;
  membersPaidOut: number;
  /** Savings still held, including locked joining fees. */
  savingsHeld: number;
  loansOutstanding: number;
  pendingDeductions: number;
};

/**
 * A chama can only be deleted once it's clean for everyone: every member has
 * received their merry-go-round payout, all savings (and joining fees) have
 * been paid back out, and no loans are outstanding.
 */
export function deletionChecklist(s: GroupSnapshot) {
  const items = [
    {
      label: "Every member has received their merry-go-round payout",
      done: s.membersPaidOut === s.memberCount,
      detail: `${s.membersPaidOut} of ${s.memberCount} paid out`,
    },
    {
      label: "All savings and joining fees have been shared out",
      done: s.savingsHeld === 0,
      detail: s.savingsHeld === 0 ? "Nothing held" : `${money(s.savingsHeld)} still held`,
    },
    {
      label: "No loans outstanding",
      done: s.loansOutstanding === 0,
      detail: s.loansOutstanding === 0 ? "All repaid" : `${money(s.loansOutstanding)} still owed`,
    },
    {
      label: "No contributions waiting to be collected",
      done: s.pendingDeductions === 0,
      detail: s.pendingDeductions === 0 ? "Up to date" : `${s.pendingDeductions} pending`,
    },
  ];
  return { items, canDelete: items.every((i) => i.done) };
}

/** Validation for the create-chama form. Returns a message per invalid field. */
export function validateRules(r: Partial<GroupRules> & { startMonth?: string }) {
  const errors: Partial<Record<keyof GroupRules | "startMonth", string>> = {};
  if (!r.name || r.name.trim().length < 3) errors.name = "Give your chama a name (at least 3 characters).";
  if (!r.memberCount || r.memberCount < 2 || r.memberCount > 30) errors.memberCount = "A chama needs between 2 and 30 members.";
  if (!r.startMonth) errors.startMonth = "Choose the month the first draw happens.";
  if (!r.monthlyContribution || r.monthlyContribution < 1) errors.monthlyContribution = "Enter the monthly merry-go-round contribution.";
  if (r.monthlySavings == null || r.monthlySavings < 0) errors.monthlySavings = "Savings can be zero, but not negative.";
  if (!r.joiningFee || r.joiningFee < 1) errors.joiningFee = "The joining fee verifies each member's PayPal, so it must be at least $1.";
  if (!r.deductionDay || r.deductionDay < 1 || r.deductionDay > 28) errors.deductionDay = "Pick a day between 1 and 28 so it exists in every month.";
  if (!r.loanMultiplier || r.loanMultiplier < 1 || r.loanMultiplier > 5) errors.loanMultiplier = "Choose a multiplier between 1× and 5×.";
  if (r.loanInterestRate == null || r.loanInterestRate < 0 || r.loanInterestRate > 30) errors.loanInterestRate = "Interest must be between 0% and 30%.";
  return errors;
}

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
