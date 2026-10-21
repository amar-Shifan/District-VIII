"use client";

import { useState } from "react";
import { PALETTE } from "@/lib/theme";

export interface ThemeColors {
  burgundy: string;
  burgundyDark: string;
  burgundyBright: string;
  blush: string;
  white: string;
  wineInk: string;
}

const FALLBACK: ThemeColors = PALETTE;

function readColors(): ThemeColors {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    burgundy: read("--color-burgundy", FALLBACK.burgundy),
    burgundyDark: read("--color-burgundy-dark", FALLBACK.burgundyDark),
    burgundyBright: read("--color-burgundy-bright", FALLBACK.burgundyBright),
    blush: read("--color-blush", FALLBACK.blush),
    white: read("--color-white", FALLBACK.white),
    wineInk: read("--color-wine-ink", FALLBACK.wineInk),
  };
}

/** Reads the palette tokens from CSS so SVG charts use exactly the theme colors. Charts render client-only. */
export function useThemeColors(): ThemeColors {
  const [colors] = useState(readColors);
  return colors;
}
