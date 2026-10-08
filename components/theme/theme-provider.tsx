"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Adds or removes the `dark` class on <html>; globals.css defines the dark tokens. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
