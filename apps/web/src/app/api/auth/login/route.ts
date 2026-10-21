import { NextResponse } from "next/server";
import { login, setSessionCookie } from "@/server/auth";
import { parseBody, rateLimit, route } from "@/server/http";
import { loginSchema } from "@/server/validation";

/** Exchanges credentials for a session kept in an httpOnly cookie. */
export const POST = route(async (request) => {
  rateLimit(request, "login", 5);
  const { email, password } = await parseBody(request, loginSchema);
  const { admin, token, maxAge } = await login(email, password);
  const response = NextResponse.json({ admin, expiresIn: maxAge });
  setSessionCookie(response, token, maxAge);
  return response;
});
