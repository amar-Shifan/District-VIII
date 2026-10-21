import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isTokenUsable } from "@/lib/admin-session";

/**
 * Optimistic admin route protection: no unexpired session cookie means a
 * redirect to the login page. The API still verifies every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const signedIn = isTokenUsable(token);
  const onLogin = pathname === "/admin/login";

  if (!signedIn && !onLogin) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(ADMIN_COOKIE);
    return response;
  }
  if (signedIn && onLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
