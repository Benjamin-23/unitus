"use client";

import type { ColDef, ICellRendererParams, ValueFormatterParams } from "ag-grid-community";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/chama";
import { LEDGER, MEMBERS, SCHEDULE, type LedgerRow, type MemberRow, type ScheduleRow } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DataGrid } from "./data-grid";

const fmtMoney = (p: ValueFormatterParams) => (p.value ? money(p.value) : "—");
const fmtDate = (p: ValueFormatterParams) =>
  p.value ? new Date(`${p.value}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "Completed" || value === "Paid"
      ? "bg-secondary text-primary"
      : value === "Failed" || value === "Late"
        ? "bg-destructive/10 text-destructive"
        : "bg-accent/30 text-accent-foreground";
  return <Badge className={cn("border-0 font-medium", tone)}>{value}</Badge>;
}

const ledgerCols: ColDef<LedgerRow>[] = [
  { field: "date", headerName: "Date", valueFormatter: fmtDate, sort: "desc", maxWidth: 140 },
  { field: "type", headerName: "Type", maxWidth: 170 },
  { field: "description", headerName: "Description", flex: 2, minWidth: 220 },
  {
    field: "amount",
    headerName: "Amount",
    type: "rightAligned",
    maxWidth: 150,
    cellRenderer: (p: ICellRendererParams<LedgerRow>) => (
      <span className={cn("font-semibold tabular-nums", p.data?.direction === "out" ? "text-clay" : "text-primary")}>
        {p.data?.direction === "out" ? "−" : "+"}
        {money(p.value)}
      </span>
    ),
  },
  { field: "status", headerName: "Status", maxWidth: 140, cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value} /> },
  { field: "reference", headerName: "PayPal ref", maxWidth: 150, cellClass: "font-mono text-xs" },
];

export function LedgerGrid() {
  return <DataGrid<LedgerRow> rowData={LEDGER} columnDefs={ledgerCols} pagination paginationPageSize={10} paginationPageSizeSelector={[10, 25, 50]} height={560} />;
}

const scheduleCols: ColDef<ScheduleRow>[] = [
  { field: "date", headerName: "Deduction date", valueFormatter: fmtDate, maxWidth: 170 },
  { field: "contribution", headerName: "Merry-go-round", valueFormatter: fmtMoney, type: "rightAligned" },
  { field: "savings", headerName: "Savings", valueFormatter: fmtMoney, type: "rightAligned" },
  { field: "loanRepayment", headerName: "Loan repayment", valueFormatter: fmtMoney, type: "rightAligned" },
  {
    field: "total",
    headerName: "Total from PayPal",
    type: "rightAligned",
    cellRenderer: (p: ICellRendererParams) => <span className="font-semibold tabular-nums">{money(p.value)}</span>,
  },
  { field: "note", headerName: "Note", flex: 1.6, minWidth: 220, cellClass: "text-muted-foreground" },
];

export function ScheduleGrid() {
  return <DataGrid<ScheduleRow> rowData={SCHEDULE} columnDefs={scheduleCols} />;
}

const memberCols: ColDef<MemberRow>[] = [
  {
    field: "name",
    headerName: "Member",
    minWidth: 190,
    cellRenderer: (p: ICellRendererParams<MemberRow>) => (
      <span className="font-medium">
        {p.value}
        {p.data?.isYou && <span className="ml-2 rounded-full bg-accent/40 px-2 py-0.5 text-xs">You</span>}
      </span>
    ),
  },
  { field: "country", headerName: "Lives in", minWidth: 170 },
  { field: "octoberStatus", headerName: "October", maxWidth: 130, cellRenderer: (p: ICellRendererParams) => <StatusBadge value={p.value} /> },
  { field: "savings", headerName: "Savings", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 130 },
  {
    field: "payoutMonth",
    headerName: "Merry-go-round",
    minWidth: 160,
    cellRenderer: (p: ICellRendererParams<MemberRow>) =>
      p.value ? (
        <span className="text-muted-foreground">Received {p.value}</span>
      ) : (
        <span className="font-medium text-primary">Still in the draw</span>
      ),
  },
  { field: "loanBalance", headerName: "Loan balance", valueFormatter: fmtMoney, type: "rightAligned", maxWidth: 150 },
];

export function MembersGrid() {
  return (
    <DataGrid<MemberRow>
      rowData={MEMBERS}
      columnDefs={memberCols}
      getRowClass={(p) => (p.data?.isYou ? "font-semibold" : undefined)}
    />
  );
}
