// Demo data for the UI until the backend and PayPal integration are wired up.
import type { Group, MemberAccount } from "./chama";

export const DEMO_GROUP: Group = {
  id: "grp_umoja",
  name: "Umoja Diaspora Chama",
  inviteCode: "UMOJA-7K2Q",
  currency: "USD",
  joiningFee: 100,
  monthlyContribution: 100,
  monthlySavings: 50,
  loanMultiplier: 3,
  loanInterestRate: 5,
  shareOut: "year-end",
  deductionDay: 1,
  memberCount: 10,
  cycle: { startMonth: "Mar 2026", endMonth: "Dec 2026", drawsCompleted: 7 },
};

export const DEMO_USER = { name: "Amani Otieno", email: "amani@example.com", initials: "AO", paypalEmail: "am•••@example.com" };

export const DEMO_ACCOUNT: MemberAccount = {
  savings: 350,
  lockedJoiningFee: 100,
  hasReceivedPayout: false,
  loan: { principal: 600, interestRate: 5, months: 6, instalmentsPaid: 3, disbursedOn: "2026-07-03" },
};

export type LedgerRow = {
  date: string;
  type: "Joining fee" | "Contribution" | "Savings" | "Loan repayment" | "Loan disbursed" | "Share-out";
  description: string;
  amount: number;
  direction: "in" | "out";
  status: "Completed" | "Failed";
  reference: string;
};

const MONTHS = ["2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

export const LEDGER: LedgerRow[] = (() => {
  const rows: LedgerRow[] = [
    {
      date: "2026-03-01",
      type: "Joining fee",
      description: "Joining fee, locked in savings",
      amount: 100,
      direction: "in",
      status: "Completed",
      reference: "PP-8F21A0",
    },
  ];
  MONTHS.forEach((m, i) => {
    const ref = (n: number) => `PP-${(0x9a3c10 + i * 17 + n).toString(16).toUpperCase()}`;
    const late = m === "2026-06";
    rows.push(
      { date: `${m}-01`, type: "Contribution", description: "Merry-go-round contribution", amount: 100, direction: "in", status: late ? "Failed" : "Completed", reference: ref(1) },
      { date: `${m}-01`, type: "Savings", description: "Monthly savings", amount: 50, direction: "in", status: "Completed", reference: ref(2) },
    );
    if (late) {
      rows.push({ date: "2026-06-03", type: "Contribution", description: "Retry after failed auto-deduction", amount: 100, direction: "in", status: "Completed", reference: ref(3) });
    }
    if (["2026-08", "2026-09", "2026-10"].includes(m)) {
      rows.push({ date: `${m}-01`, type: "Loan repayment", description: "Instalment on $600 loan", amount: 105, direction: "in", status: "Completed", reference: ref(4) });
    }
  });
  rows.push({ date: "2026-07-03", type: "Loan disbursed", description: "Loan at 5% flat over 6 months", amount: 600, direction: "out", status: "Completed", reference: "PP-71C0DE" });
  return rows.sort((a, b) => b.date.localeCompare(a.date));
})();

export type ScheduleRow = {
  date: string;
  contribution: number;
  savings: number;
  loanRepayment: number;
  total: number;
  note: string;
};

export const SCHEDULE: ScheduleRow[] = [
  { date: "2026-11-01", contribution: 100, savings: 50, loanRepayment: 105, total: 255, note: "Draw 9 of 10" },
  { date: "2026-12-01", contribution: 100, savings: 50, loanRepayment: 105, total: 255, note: "Final draw, cycle ends" },
  { date: "2027-01-01", contribution: 100, savings: 50, loanRepayment: 105, total: 255, note: "New cycle starts, last loan instalment" },
  { date: "2027-02-01", contribution: 100, savings: 50, loanRepayment: 0, total: 150, note: "" },
  { date: "2027-03-01", contribution: 100, savings: 50, loanRepayment: 0, total: 150, note: "" },
  { date: "2027-04-01", contribution: 100, savings: 50, loanRepayment: 0, total: 150, note: "" },
];

export type MemberRow = {
  name: string;
  country: string;
  joined: string;
  octoberStatus: "Paid" | "Pending" | "Late";
  savings: number;
  payoutMonth: string | null;
  loanBalance: number;
  isYou?: boolean;
};

export const MEMBERS: MemberRow[] = [
  { name: "Wanjiru Kamau", country: "🇬🇧 United Kingdom", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: "Mar 2026", loanBalance: 0 },
  { name: "Joseph Mwangi", country: "🇦🇪 UAE", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: "Apr 2026", loanBalance: 0 },
  { name: "Faith Njeri", country: "🇰🇪 Kenya", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: "May 2026", loanBalance: 210 },
  { name: "Brian Ochieng", country: "🇨🇦 Canada", joined: "2026-03-01", octoberStatus: "Pending", savings: 400, payoutMonth: "Jun 2026", loanBalance: 0 },
  { name: "Grace Achieng", country: "🇺🇸 United States", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: "Jul 2026", loanBalance: 0 },
  { name: "Kevin Kiprop", country: "🇩🇪 Germany", joined: "2026-03-01", octoberStatus: "Late", savings: 350, payoutMonth: "Aug 2026", loanBalance: 0 },
  { name: "Mercy Wambui", country: "🇦🇺 Australia", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: "Sep 2026", loanBalance: 0 },
  { name: "Amani Otieno", country: "🇬🇧 United Kingdom", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: null, loanBalance: 315, isYou: true },
  { name: "Daniel Mutua", country: "🇶🇦 Qatar", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: null, loanBalance: 0 },
  { name: "Esther Chebet", country: "🇰🇪 Kenya", joined: "2026-03-01", octoberStatus: "Paid", savings: 450, payoutMonth: null, loanBalance: 0 },
];

export const GROUP_SNAPSHOT = {
  memberCount: DEMO_GROUP.memberCount,
  membersPaidOut: MEMBERS.filter((m) => m.payoutMonth).length,
  savingsHeld: MEMBERS.reduce((s, m) => s + m.savings, 0),
  loansOutstanding: MEMBERS.reduce((s, m) => s + m.loanBalance, 0),
  pendingDeductions: MEMBERS.filter((m) => m.octoberStatus !== "Paid").length,
};

/** Savings held, minus money out on loan, plus this month's contributions waiting for the draw. */
export const CHAMA_ACCOUNT_BALANCE =
  GROUP_SNAPSHOT.savingsHeld -
  GROUP_SNAPSHOT.loansOutstanding +
  MEMBERS.filter((m) => m.octoberStatus === "Paid").length * DEMO_GROUP.monthlyContribution;

export type MonthlyRow = {
  month: string;
  contributions: number;
  savings: number;
  loanRepayments: number;
  loansIssued: number;
  payout: number;
  winner: string;
};

/** Group-wide totals per month for the analytics view. */
export const MONTHLY: MonthlyRow[] = [
  { month: "Mar 2026", contributions: 1000, savings: 500, loanRepayments: 0, loansIssued: 0, payout: 1000, winner: "Wanjiru Kamau" },
  { month: "Apr 2026", contributions: 1000, savings: 500, loanRepayments: 0, loansIssued: 300, payout: 1000, winner: "Joseph Mwangi" },
  { month: "May 2026", contributions: 1000, savings: 500, loanRepayments: 52.5, loansIssued: 0, payout: 1000, winner: "Faith Njeri" },
  { month: "Jun 2026", contributions: 1000, savings: 500, loanRepayments: 52.5, loansIssued: 0, payout: 1000, winner: "Brian Ochieng" },
  { month: "Jul 2026", contributions: 1000, savings: 500, loanRepayments: 52.5, loansIssued: 600, payout: 1000, winner: "Grace Achieng" },
  { month: "Aug 2026", contributions: 1000, savings: 450, loanRepayments: 157.5, loansIssued: 0, payout: 1000, winner: "Kevin Kiprop" },
  { month: "Sep 2026", contributions: 1000, savings: 500, loanRepayments: 157.5, loansIssued: 0, payout: 1000, winner: "Mercy Wambui" },
  { month: "Oct 2026", contributions: 800, savings: 400, loanRepayments: 157.5, loansIssued: 0, payout: 0, winner: "Draw pending" },
];
