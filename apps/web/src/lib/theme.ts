/**
 * The few places that need literal colors outside CSS: the viewport
 * theme-color and SVG chart fallbacks before CSS variables are readable.
 * Mirrors the tokens in globals.css; keep them in sync.
 */
export const THEME_COLOR_INK = "#0a0a0a";

export const PALETTE = {
  burgundy: "#7a1020",
  burgundyDark: "#4a0812",
  burgundyBright: "#a01830",
  blush: "#e8d5d8",
  white: "#ffffff",
  wineInk: "#1a0a0d",
} as const;
