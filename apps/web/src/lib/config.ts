/**
 * Runtime configuration. Flip NEXT_PUBLIC_USE_MOCK to "false" to talk to the
 * NestJS API at NEXT_PUBLIC_API_URL instead of the in-browser mock.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** How often live availability is refetched on the Home screen. */
export const LIVE_REFETCH_MS = 15_000;
