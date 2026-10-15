"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { AgReportState } from "ag-studio";
import { AgStudio, AgStudioProvider } from "ag-studio-react";
import { PencilRulerIcon, EyeIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createUnitusStudioTheme } from "./studio-theme";

const LICENSE_KEY = process.env.NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY;

const usd = { format: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }) };

/** Real chama data, prepared on the server (see app/dashboard/analytics/page.tsx). */
export type StudioData = {
  monthly: { month: string; contributions: number; savings: number; joiningFees: number }[];
  members: { name: string; country: string; memberCountry: string; feePaid: string; months: number; contributed: number; savings: number }[];
};

function buildSources({ monthly, members }: StudioData) {
  return {
    sources: [
      {
        id: "monthly",
        name: "Totals by round",
        data: monthly,
        fields: [
          { id: "month", name: "Round", format: "textFormat" as const },
          { id: "contributions", name: "Contributions", format: "currencyFormat" as const, formatOptions: usd },
          { id: "savings", name: "Savings", format: "currencyFormat" as const, formatOptions: usd },
          { id: "joiningFees", name: "Joining fees", format: "currencyFormat" as const, formatOptions: usd },
        ],
      },
      {
        id: "members",
        name: "Members",
        data: members,
        fields: [
          { id: "name", name: "Member", format: "textFormat" as const },
          { id: "country", name: "Country", format: "textFormat" as const },
          { id: "memberCountry", name: "Member (country)", format: "textFormat" as const },
          { id: "feePaid", name: "Joining fee", format: "textFormat" as const },
          { id: "months", name: "Rounds paid", format: "integerFormat" as const },
          { id: "contributed", name: "Contributed", format: "currencyFormat" as const, formatOptions: usd },
          { id: "savings", name: "Savings", format: "currencyFormat" as const, formatOptions: usd },
        ],
      },
    ],
  };
}

const title = (text: string) => ({ title: { enabled: true, text } });
const ref = (id: string, aggregation?: "sum" | "count") => ({ id, ...(aggregation ? { aggregation } : {}) });

// The pre-built report. Studio's canvas is 24 columns wide with 16px rows.
const INITIAL_STATE = {
  selectedPageId: "overview",
  pages: [
    {
      id: "overview",
      widgets: {
        kpiSavings: { type: "value", dataMapping: { value: [ref("members.savings", "sum")] }, format: title("Savings held") },
        kpiCollected: { type: "value", dataMapping: { value: [ref("monthly.contributions", "sum")] }, format: title("Contributions") },
        kpiFees: { type: "value", dataMapping: { value: [ref("monthly.joiningFees", "sum")] }, format: title("Joining fees") },
        kpiMembers: { type: "value", dataMapping: { value: [ref("members.name", "count")] }, format: title("Members") },
        monthlyChart: {
          type: "column-chart-stacked",
          dataMapping: {
            categoryKey: [ref("monthly.month")],
            valueKey: [ref("monthly.contributions", "sum"), ref("monthly.savings", "sum"), ref("monthly.joiningFees", "sum")],
          },
          format: title("Money in, by round"),
        },
        memberShare: {
          type: "donut-chart",
          dataMapping: { categoryKey: [ref("members.memberCountry")], valueKey: [ref("members.contributed", "sum")] },
          format: title("Contributions by member"),
        },
        countryShare: {
          type: "bar-chart-grouped",
          dataMapping: { categoryKey: [ref("members.country")], valueKey: [ref("members.contributed", "sum"), ref("members.savings", "sum")] },
          format: title("Contributions by country"),
        },
        countryMembers: {
          type: "donut-chart",
          dataMapping: { categoryKey: [ref("members.country")], valueKey: [ref("members.name", "count")] },
          format: title("Members by country"),
        },
        memberChart: {
          type: "bar-chart-grouped",
          dataMapping: { categoryKey: [ref("members.memberCountry")], valueKey: [ref("members.contributed", "sum"), ref("members.savings", "sum")] },
          format: title("Contributed and saved per member"),
        },
        memberGrid: {
          type: "grid",
          dataMapping: { cols: [ref("members.name"), ref("members.country"), ref("members.feePaid"), ref("members.months"), ref("members.contributed"), ref("members.savings")] },
          format: title("Members"),
        },
      },
      widgetLayout: {
        kpiSavings: { xTrack: 0, yTrack: 0, xSpan: 6, ySpan: 7 },
        kpiCollected: { xTrack: 6, yTrack: 0, xSpan: 6, ySpan: 7 },
        kpiFees: { xTrack: 12, yTrack: 0, xSpan: 6, ySpan: 7 },
        kpiMembers: { xTrack: 18, yTrack: 0, xSpan: 6, ySpan: 7 },
        monthlyChart: { xTrack: 0, yTrack: 7, xSpan: 15, ySpan: 22 },
        memberShare: { xTrack: 15, yTrack: 7, xSpan: 9, ySpan: 22 },
        countryShare: { xTrack: 0, yTrack: 29, xSpan: 15, ySpan: 22 },
        countryMembers: { xTrack: 15, yTrack: 29, xSpan: 9, ySpan: 22 },
        memberChart: { xTrack: 0, yTrack: 51, xSpan: 11, ySpan: 26 },
        memberGrid: { xTrack: 11, yTrack: 51, xSpan: 13, ySpan: 26 },
      },
    },
  ],
} as unknown as AgReportState;

export function ChamaStudio({ data: studioData }: { data: StudioData }) {
  const data = useMemo(() => buildSources(studioData), [studioData]);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [resetKey, setResetKey] = useState(0);
  // next/font generates the font family names; read them so Studio matches the page.
  // Safe here because this component is only rendered in the browser (see chama-studio-loader).
  const [fonts] = useState(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      body: getComputedStyle(document.body).fontFamily,
      display: root.getPropertyValue("--font-display").trim() || "serif",
    };
  });

  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme === "dark" ? "dark" : "light";
  const theme = useMemo(() => createUnitusStudioTheme(fonts, colorMode), [fonts, colorMode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {mode === "view"
            ? "Click any chart to cross-filter the others."
            : "Drag fields onto the canvas to build your own charts. Changes stay in this browser tab."}
        </p>
        <div className="flex gap-2">
          {mode === "edit" && (
            <Button variant="ghost" onClick={() => setResetKey((k) => k + 1)}>
              <RotateCcwIcon data-icon="inline-start" /> Reset
            </Button>
          )}
          <Button variant={mode === "edit" ? "default" : "outline"} onClick={() => setMode((m) => (m === "view" ? "edit" : "view"))}>
            {mode === "view" ? <PencilRulerIcon data-icon="inline-start" /> : <EyeIcon data-icon="inline-start" />}
            {mode === "view" ? "Customise" : "Done"}
          </Button>
        </div>
      </div>
      <div className="h-[1320px] overflow-hidden rounded-3xl border bg-card">
        <AgStudioProvider licenseKey={LICENSE_KEY}>
          <AgStudio
            key={resetKey}
            data={data}
            initialState={INITIAL_STATE}
            mode={mode}
            theme={theme}
            // No filters panel while viewing; charts still cross-filter on click.
            panels={{ view: {}, edit: { left: ["data"], right: ["edit", "filters"] } }}
            style={{ height: "100%", width: "100%" }}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}
