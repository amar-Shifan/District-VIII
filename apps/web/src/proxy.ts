import { jwtVerify } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-session";

async function hasValidSession(token: string | undefined): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Admin route protection: no valid session cookie means a redirect to the
 * login page. Every /api admin route also checks the session itself.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const signedIn = await hasValidSession(token);
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
