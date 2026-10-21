/** Names shared by the admin client, proxy.ts and the /api route handlers. */

/** httpOnly cookie holding the admin session JWT. Browser code never reads it. */
export const ADMIN_COOKIE = "d8_admin";

/** Header required on admin mutations sent with the cookie. Cross-site forms can't set it, which blocks CSRF. */
export const ADMIN_REQUEST_HEADER = "x-admin-request";
