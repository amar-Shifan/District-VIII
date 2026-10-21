/**
 * Runtime configuration. The customer app talks to the NestJS API at
 * NEXT_PUBLIC_API_URL; set NEXT_PUBLIC_USE_MOCK=true to use the in-browser
 * mock instead (handy for UI work without a database).
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Hosts next/image is configured to optimize (see next.config.ts). */
export const IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "images.unsplash.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** Polling fallback for live data. Socket events refresh sooner when connected. */
export const LIVE_REFETCH_MS = 15_000;
