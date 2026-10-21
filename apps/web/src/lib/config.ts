/**
 * Runtime configuration. The customer app talks to the NestJS API at
 * NEXT_PUBLIC_API_URL; set NEXT_PUBLIC_USE_MOCK=true to use the in-browser
 * mock instead (handy for UI work without a database).
 */
const CONFIGURED_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * When the API is configured as localhost but the page was opened from
 * another device (e.g. a phone at http://192.168.1.35:3000), call the API on
 * that same host so the phone doesn't try to reach its own localhost.
 */
function resolveApiUrl(): string {
  if (typeof window === "undefined") return CONFIGURED_API_URL;
  try {
    const url = new URL(CONFIGURED_API_URL);
    if (LOOPBACK_HOSTS.has(url.hostname) && !LOOPBACK_HOSTS.has(window.location.hostname)) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    // Not a valid absolute URL: use it as configured.
  }
  return CONFIGURED_API_URL;
}

export const API_URL = resolveApiUrl();

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/** Hosts next/image is configured to optimize (see next.config.ts). */
export const IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "images.unsplash.com")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** Polling fallback for live data. Socket events refresh sooner when connected. */
export const LIVE_REFETCH_MS = 15_000;
