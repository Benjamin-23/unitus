"use client";

import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/chama";
import type { LedgerRow, MemberRow, ScheduleRow } from "@/lib/dashboard";
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
