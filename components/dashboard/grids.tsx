"use client";

import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/chama";
import type { LedgerRow, MemberRow, ScheduleRow } from "@/lib/dashboard";
import type { StatementRow } from "@/lib/ledger";
import type { WalletChama, WalletTransaction } from "@/lib/wallet";
import { cn } from "@/lib/utils";
import { DataGrid } from "./data-grid";

const fmtMoney = (p: ValueFormatterParams) => (p.value ? money(p.value) : "—");
const fmtDate = (p: ValueFormatterParams) =>
  p.value ? new Date(p.value.length === 10 ? `${p.value}T00:00:00Z` : p.value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "";
const fmtPeriod = (p: ValueFormatterParams) => {
  if (!p.value) return "";
  const [y, m] = String(p.value).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
};

function StatusBadge({ value }: { value: string }) {
  const label = value === "COMPLETED" ? "Completed" : value.charAt(0) + value.slice(1).toLowerCase();
  const tone =
    value === "COMPLETED" || value === "Paid"
      ? "bg-secondary text-primary"
      : ["DENIED", "DECLINED", "FAILED", "Not paid"].includes(value)
        ? "bg-destructive/10 text-destructive"
        : "bg-accent/30 text-accent-foreground";
  return <Badge className={cn("border-0 font-medium", tone)}>{label}</Badge>;
}

function Name({ value, isYou }: { value: string; isYou?: boolean }) {
  return (
    <span className="font-medium">
      {value}
      {isYou && <span className="ml-2 rounded-full bg-accent/40 px-2 py-0.5 text-xs">You</span>}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

const ledgerCols: ColDef<LedgerRow>[] = [
  { field: "date", headerName: "Date", valueFormatter: fmtDate, sort: "desc", maxWidth: 140 },
  {
    field: "member",
    headerName: "Member",
    minWidth: 170,
    cellRenderer: (p: ICellRendererParams<LedgerRow>) => <Name value={p.value} isYou={p.data?.isYou} />,
  },
  { field: "type", headerName: "Type", maxWidth: 190 },
  { field: "period", headerName: "For", valueFormatter: fmtPeriod, maxWidth: 120 },
  {
    field: "amount",
    headerName: "To the chama",
    type: "rightAligned",
    maxWidth: 150,
    cellRenderer: (p: ICellRendererParams<LedgerRow>) => <span className="font-semibold text-primary tabular-nums">+{money(p.value)}</span>,
  },
  { field: "fee", headerName: "PayPal fee", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 130 },
  { field: "charged", headerName: "Charged", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 130 },
  { field: "status", headerName: "Status", maxWidth: 140, cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value} /> },
  { field: "reference", headerName: "PayPal ref", minWidth: 160, cellClass: "font-mono text-xs" },
];

export function LedgerGrid({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) return <Empty>No payments yet. Joining fees and monthly contributions will appear here.</Empty>;
  return <DataGrid<LedgerRow> rowData={rows} columnDefs={ledgerCols} pagination paginationPageSize={10} paginationPageSizeSelector={[10, 25, 50]} height={560} />;
}

const scheduleCols: ColDef<ScheduleRow>[] = [
  { field: "date", headerName: "Deduction date", valueFormatter: fmtDate, maxWidth: 170 },
  { field: "contribution", headerName: "Merry-go-round", valueFormatter: fmtMoney, type: "rightAligned" },
  { field: "savings", headerName: "Savings", valueFormatter: fmtMoney, type: "rightAligned" },
  { field: "fee", headerName: "PayPal fee", valueFormatter: fmtMoney, type: "rightAligned" },
  {
    field: "total",
    headerName: "Total from PayPal",
    type: "rightAligned",
    cellRenderer: (p: ICellRendererParams) => <span className="font-semibold tabular-nums">{money(p.value)}</span>,
  },
  { field: "note", headerName: "Note", flex: 1.6, minWidth: 200, cellClass: "text-muted-foreground" },
];

export function ScheduleGrid({ rows }: { rows: ScheduleRow[] }) {
  if (rows.length === 0) return <Empty>No upcoming deductions: this chama&apos;s cycle has finished.</Empty>;
  return <DataGrid<ScheduleRow> rowData={rows} columnDefs={scheduleCols} />;
}

const memberCols: ColDef<MemberRow>[] = [
  {
    field: "name",
    headerName: "Member",
    minWidth: 190,
    cellRenderer: (p: ICellRendererParams<MemberRow>) => <Name value={p.value} isYou={p.data?.isYou} />,
  },
  { field: "joined", headerName: "Joined", valueFormatter: fmtDate, maxWidth: 140 },
  {
    field: "feePaid",
    headerName: "Joining fee",
    maxWidth: 140,
    cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value ? "Paid" : "Not paid"} />,
  },
  {
    field: "paidThisMonth",
    headerName: "This month",
    maxWidth: 140,
    cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value ? "Paid" : "PENDING"} />,
  },
  { field: "months", headerName: "Months paid", type: "rightAligned", maxWidth: 140 },
  { field: "contributed", headerName: "Contributed", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 150 },
  { field: "savings", headerName: "Savings", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 140 },
  {
    field: "balance",
    headerName: "Balance",
    type: "rightAligned",
    maxWidth: 140,
    cellRenderer: (p: ICellRendererParams) => <span className="font-semibold tabular-nums">{money(p.value)}</span>,
  },
  { field: "feesPaid", headerName: "Fees paid", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 130 },
];

export function MembersGrid({ rows }: { rows: MemberRow[] }) {
  if (rows.length === 0) return <Empty>No members yet. Share the invite link so people can join.</Empty>;
  return <DataGrid<MemberRow> rowData={rows} columnDefs={memberCols} getRowClass={(p) => (p.data?.isYou ? "font-semibold" : undefined)} />;
}

const statementCols: ColDef<StatementRow>[] = [
  { field: "date", headerName: "Date", valueFormatter: fmtDate, maxWidth: 140 },
  { field: "description", headerName: "Description", minWidth: 200 },
  {
    field: "member",
    headerName: "Member",
    minWidth: 160,
    cellRenderer: (p: ICellRendererParams<StatementRow>) => (p.value ? <Name value={p.value} isYou={p.data?.isYou} /> : "—"),
  },
  { field: "account", headerName: "Account", minWidth: 200 },
  { field: "accountNumber", headerName: "Account no.", minWidth: 190, cellClass: "font-mono text-xs" },
  {
    field: "amount",
    headerName: "Amount",
    type: "rightAligned",
    maxWidth: 140,
    cellRenderer: (p: ICellRendererParams) => (
      <span className={cn("font-semibold tabular-nums", p.value >= 0 ? "text-primary" : "text-clay")}>
        {p.value >= 0 ? "+" : "−"}
        {money(Math.abs(p.value))}
      </span>
    ),
  },
  {
    field: "balance",
    headerName: "Chama balance",
    type: "rightAligned",
    maxWidth: 160,
    cellRenderer: (p: ICellRendererParams) => <span className="tabular-nums">{money(p.value)}</span>,
  },
];

export function StatementGrid({ rows }: { rows: StatementRow[] }) {
  if (rows.length === 0) return <Empty>No entries yet. Every payment into this chama&apos;s accounts appears here.</Empty>;
  return <DataGrid<StatementRow> rowData={rows} columnDefs={statementCols} pagination paginationPageSize={10} paginationPageSizeSelector={[10, 25, 50]} height={560} />;
}

const signed = (p: ICellRendererParams) =>
  p.value ? (
    <span className={cn("tabular-nums", p.value > 0 ? "text-primary" : "text-clay")}>
      {p.value > 0 ? "+" : "−"}
      {money(Math.abs(p.value))}
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const walletChamaCols: ColDef<WalletChama>[] = [
  { field: "name", headerName: "Chama", minWidth: 180, cellRenderer: (p: ICellRendererParams) => <span className="font-medium">{p.value}</span> },
  { field: "accountNumber", headerName: "Account no.", minWidth: 160, cellClass: "font-mono text-xs" },
  {
    field: "status",
    headerName: "Status",
    maxWidth: 130,
    cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value === "open" ? "Open" : p.value === "active" ? "Paid" : "Closed"} />,
  },
  { headerName: "Members", maxWidth: 130, valueGetter: (p) => (p.data ? `${p.data.members} / ${p.data.memberLimit}` : "") },
  { field: "createdAt", headerName: "Created", valueFormatter: fmtDate, maxWidth: 140 },
  {
    field: "balance",
    headerName: "Balance held",
    type: "rightAligned",
    sort: "desc",
    maxWidth: 160,
    cellRenderer: (p: ICellRendererParams) => <span className="font-semibold tabular-nums">{money(p.value)}</span>,
  },
];

export function WalletChamasGrid({ rows }: { rows: WalletChama[] }) {
  if (rows.length === 0) return <Empty>No chamas yet.</Empty>;
  return <DataGrid<WalletChama> rowData={rows} columnDefs={walletChamaCols} pagination paginationPageSize={10} paginationPageSizeSelector={[10, 25, 50]} height={460} />;
}

const walletTxCols: ColDef<WalletTransaction>[] = [
  { field: "date", headerName: "Date", valueFormatter: fmtDate, sort: "desc", maxWidth: 130 },
  { field: "chama", headerName: "Chama", minWidth: 150 },
  { field: "accountNumber", headerName: "Account no.", minWidth: 150, cellClass: "font-mono text-xs" },
  { field: "type", headerName: "Type", minWidth: 170 },
  { field: "member", headerName: "Member", minWidth: 140, valueFormatter: (p) => p.value ?? "—" },
  { field: "gross", headerName: "Paid by member", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 150 },
  { field: "paypalFee", headerName: "PayPal fee", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 120 },
  { field: "toPool", headerName: "Into pool", type: "rightAligned", maxWidth: 130, cellRenderer: signed },
  { field: "toChama", headerName: "To chama", type: "rightAligned", maxWidth: 130, cellRenderer: signed },
  { field: "unitus", headerName: "Unitus", headerTooltip: "Negative: Unitus covered a fee gap. Positive: Unitus kept the difference.", type: "rightAligned", maxWidth: 120, cellRenderer: signed },
];

export function WalletTransactionsGrid({ rows }: { rows: WalletTransaction[] }) {
  if (rows.length === 0) return <Empty>No transactions yet. Every payment into any chama appears here.</Empty>;
  return <DataGrid<WalletTransaction> rowData={rows} columnDefs={walletTxCols} pagination paginationPageSize={15} paginationPageSizeSelector={[15, 50, 100]} height={620} />;
}
