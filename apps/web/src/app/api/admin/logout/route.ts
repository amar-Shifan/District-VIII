import { NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieOptions } from "@/lib/admin-session";

export function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(ADMIN_COOKIE, "", cookieOptions(0));
  return response;
}
