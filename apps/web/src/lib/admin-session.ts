/**
 * Admin session helpers shared by proxy.ts and the /api/admin route handlers.
 * The API's JWT lives only in an httpOnly cookie; browser code never sees it.
 */

export const ADMIN_COOKIE = "d8_admin";

/** Header required on mutating proxy calls. Cross-site forms can't set it, which blocks CSRF. */
export const ADMIN_REQUEST_HEADER = "x-admin-request";

export function apiBase(): string {
  return (process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");
}

/**
 * Reads the token's `exp` without verifying the signature. Only used for the
 * optimistic redirect in proxy.ts; the API verifies every request.
 */
export function tokenExpiresAt(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp: unknown = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenUsable(token: string | undefined): token is string {
  if (!token) return false;
  const expiresAt = tokenExpiresAt(token);
  return expiresAt !== null && expiresAt > Date.now();
}

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});
