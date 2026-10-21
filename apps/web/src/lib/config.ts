/**
 * Runtime configuration. The API lives in this same Next.js app under /api,
 * so the browser always calls its own origin (works on localhost, a phone on
 * the LAN, and Vercel alike). Set NEXT_PUBLIC_USE_MOCK=true to run the
 * customer screens on an in-browser mock instead (UI work without a database).
 */
export const API_BASE = "/api";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Hosts next/image is configured to optimize (see next.config.ts). */
export const IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "images.unsplash.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** Background refetch for data queries. */
export const LIVE_REFETCH_MS = 15_000;

/** How often screens check the change counter; changes show up within this time. */
export const LIVE_POLL_MS = 4_000;
