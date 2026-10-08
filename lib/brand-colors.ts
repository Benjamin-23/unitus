// Hex versions of the oklch tokens in app/globals.css (:root and .dark). Use these
// only where CSS variables can't be read, such as charts drawn on a <canvas>.
// Keep in sync with globals.css.

export type BrandColors = { [K in keyof typeof LIGHT]: string };

const LIGHT = {
  primary: "#0b5f40",
  primaryLight: "#419977",
  accent: "#f9bb51",
  accentDeep: "#b47825",
  clay: "#d3754f",
  claySoft: "#e3a88d",
  sky: "#6eaecd",
  skyDeep: "#2e6a8a",
  sage: "#5c8e67",
  background: "#fefaf1",
  card: "#fffdf9",
  muted: "#f5f0e5",
  secondary: "#e1f5e4",
  foreground: "#0f2419",
  mutedForeground: "#55695d",
  border: "#e3decf",
};

const DARK: BrandColors = {
  primary: "#5dc291",
  primaryLight: "#96ddb6",
  accent: "#f6b84d",
  accentDeep: "#d18e35",
  clay: "#dd8461",
  claySoft: "#eaae93",
  sky: "#6eaecd",
  skyDeep: "#4489ae",
  sage: "#74a77e",
  background: "#081711",
  card: "#0e2119",
  muted: "#152920",
  secondary: "#162f22",
  foreground: "#f3eee3",
  mutedForeground: "#9eb0a1",
  // globals.css uses white at 10% opacity; this is that blended over the card colour.
  border: "#24342d",
};

export const BRAND_COLORS = { light: LIGHT as BrandColors, dark: DARK };

/** Series colours, in order. Neighbours contrast so stacked and grouped charts stay readable. */
export function chartPalette(c: BrandColors) {
  return [c.primary, c.accent, c.clay, c.sky, c.sage, c.accentDeep, c.skyDeep, c.claySoft, c.primaryLight];
}
