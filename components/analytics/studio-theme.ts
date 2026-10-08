import { studioTheme } from "ag-studio";
import { BRAND_COLORS, chartPalette } from "@/lib/brand-colors";

/** Fills a numbered palette param set (chartPaletteFills1Color, ...) from a colour list. */
function palette(prefix: "chartPaletteFills" | "chartPaletteStrokes", colors: readonly string[]) {
  return Object.fromEntries(colors.map((c, i) => [`${prefix}${i + 1}Color`, c]));
}

/**
 * AG Studio theme in the Unitus look: cream canvas, white rounded widgets, serif
 * widget titles and the brand chart palette, in light or dark. Fonts are passed in as resolved
 * family names because next/font generates them at build time.
 */
export function createUnitusStudioTheme(fonts: { body: string; display: string }, mode: "light" | "dark" = "light") {
  const BRAND = BRAND_COLORS[mode];
  const CHART_PALETTE = chartPalette(BRAND);
  return studioTheme.withParams({
    browserColorScheme: mode,
    // Shared
    accentColor: BRAND.primary,
    backgroundColor: BRAND.card,
    foregroundColor: BRAND.foreground,
    textColor: BRAND.foreground,
    subtleTextColor: BRAND.mutedForeground,
    borderColor: BRAND.border,
    borderRadius: 10,
    fontFamily: fonts.body,
    rowHoverColor: BRAND.secondary,

    // Canvas and widgets
    studioCanvasBackgroundColor: BRAND.background,
    studioCanvasFontFamily: fonts.body,
    studioCanvasGridLineColor: BRAND.border,
    studioWidgetBackgroundColor: BRAND.card,
    studioWidgetBorder: { color: BRAND.border, width: 1 },
    studioWidgetBorderRadius: 18,
    studioWidgetPadding: 16,
    studioWidgetTitleFontFamily: fonts.display,
    studioWidgetTitleFontWeight: 600,
    studioWidgetTitleTextColor: BRAND.foreground,
    studioWidgetSubtitleTextColor: BRAND.mutedForeground,
    studioWidgetCaptionTextColor: BRAND.mutedForeground,

    // Grid widgets (matches the AG Grid tables on the dashboard)
    gridAccentColor: BRAND.primary,
    gridFontFamily: fonts.body,
    gridHeaderBackgroundColor: BRAND.muted,
    gridHeaderTextColor: BRAND.mutedForeground,
    gridHeaderFontWeight: 600,
    gridDataBackgroundColor: BRAND.card,
    gridOddRowBackgroundColor: BRAND.background,
    gridRowHoverColor: BRAND.secondary,
    gridCellTextColor: BRAND.foreground,

    // Charts (drawn on canvas, so plain hex colours)
    chartFontFamily: fonts.body,
    chartAccentColor: BRAND.primary,
    chartTextColor: BRAND.foreground,
    chartSubtleTextColor: BRAND.mutedForeground,
    chartGridLineColor: BRAND.border,
    chartAxisLineColor: BRAND.border,
    chartTooltipBackgroundColor: BRAND.foreground,
    chartTooltipTextColor: BRAND.card,
    ...palette("chartPaletteFills", CHART_PALETTE),
    ...palette("chartPaletteStrokes", CHART_PALETTE),
  });
}
