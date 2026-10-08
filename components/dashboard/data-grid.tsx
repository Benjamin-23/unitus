"use client";

import { AllCommunityModule, ModuleRegistry, themeQuartz, type GridOptions } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

ModuleRegistry.registerModules([AllCommunityModule]);

// AG Grid theme driven by the app's CSS variables, so it follows light and dark mode.
const unitusTheme = themeQuartz.withParams({
  accentColor: "var(--primary)",
  backgroundColor: "var(--card)",
  foregroundColor: "var(--foreground)",
  borderColor: "var(--border)",
  headerBackgroundColor: "var(--muted)",
  headerTextColor: "var(--muted-foreground)",
  oddRowBackgroundColor: "var(--background)",
  rowHoverColor: "var(--secondary)",
  selectedRowBackgroundColor: "var(--secondary)",
  fontFamily: "inherit",
  fontSize: 14,
  headerFontWeight: 600,
  borderRadius: 10,
  wrapperBorderRadius: 16,
  rowHeight: 48,
  headerHeight: 44,
});

/** Without a height the grid grows to fit its rows. */
export function DataGrid<T>({ height, ...props }: GridOptions<T> & { height?: number }) {
  return (
    <div style={height ? { height } : undefined} className="w-full">
      <AgGridReact<T>
        theme={unitusTheme}
        domLayout={height ? "normal" : "autoHeight"}
        animateRows
        suppressCellFocus
        defaultColDef={{ sortable: true, resizable: true, filter: true, flex: 1, minWidth: 110 }}
        {...props}
      />
    </div>
  );
}
