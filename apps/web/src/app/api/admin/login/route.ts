import type { ApiErrorBody, LoginResponse } from "@district-viii/shared";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, apiBase, cookieOptions } from "@/lib/admin-session";

/** Exchanges credentials for the API token and keeps it in an httpOnly cookie. */
export async function POST(request: NextRequest) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "The API is unreachable. Is it running?" }, { status: 502 });
  }

  const body = (await response.json()) as LoginResponse | ApiErrorBody;
  if (!response.ok || !("accessToken" in body)) {
    const message = "message" in body ? body.message : "Login failed";
    return NextResponse.json({ message }, { status: response.status });
  }

  const result = NextResponse.json({ admin: body.admin });
  result.cookies.set(ADMIN_COOKIE, body.accessToken, cookieOptions(body.expiresIn));
  return result;
}
