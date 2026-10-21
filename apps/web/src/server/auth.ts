import "server-only";

import type { AdminDto } from "@district-viii/shared";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_REQUEST_HEADER } from "@/lib/admin-session";
import { serverEnv } from "./env";
import { forbidden, unauthorized } from "./http";
import { AdminModel, type AdminRecord } from "./models";

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

interface AdminClaims {
  role: "admin";
  email: string;
}

/** Compared against when the email is unknown, so timing doesn't reveal which emails exist. */
let dummyHash: Promise<string> | null = null;

function toAdminDto(admin: Pick<AdminRecord, "_id" | "email" | "name">): AdminDto {
  return { id: String(admin._id), email: admin.email, name: admin.name };
}

export async function login(email: string, password: string): Promise<{ admin: AdminDto; token: string; maxAge: number }> {
  const admin = await AdminModel.findOne({ email }).select("+passwordHash").lean<AdminRecord>().exec();
  dummyHash ??= hashPassword("district-viii-timing-guard");
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? (await dummyHash));
  if (!admin || !valid) throw unauthorized("Invalid email or password");

  const env = serverEnv();
  const token = await new SignJWT({ role: "admin", email: admin.email } satisfies AdminClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(admin._id))
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(env.jwtSecret);
  const { payload } = await jwtVerify(token, env.jwtSecret);
  const maxAge = (payload.exp ?? 0) - (payload.iat ?? 0);
  return { admin: toAdminDto(admin), token, maxAge };
}

async function verify(token: string): Promise<AdminDto | null> {
  try {
    const { payload } = await jwtVerify<AdminClaims>(token, serverEnv().jwtSecret, { algorithms: ["HS256"] });
    if (payload.role !== "admin" || !payload.sub) return null;
    const admin = await AdminModel.findById(payload.sub).lean<AdminRecord>().exec();
    return admin ? toAdminDto(admin) : null;
  } catch {
    return null;
  }
}

function bearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Requires an admin. The panel authenticates with the httpOnly cookie; mutations
 * sent with the cookie must also carry the x-admin-request header (cross-site
 * forms can't set it, which blocks CSRF). A Bearer token works for scripts and tests.
 */
export async function requireAdmin(request: NextRequest): Promise<AdminDto> {
  const header = bearer(request);
  if (header) {
    const admin = await verify(header);
    if (!admin) throw unauthorized("Invalid or expired token");
    return admin;
  }
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookie) throw unauthorized();
  const admin = await verify(cookie);
  if (!admin) throw unauthorized("Your session has expired");
  if (request.method !== "GET" && request.headers.get(ADMIN_REQUEST_HEADER) !== "1") {
    throw forbidden("Missing admin request header");
  }
  return admin;
}

/**
 * For routes both customers and admins call (cancelling a booking): returns
 * the admin when the request is clearly an admin call, otherwise null. A
 * Bearer token that is present but invalid is rejected rather than ignored.
 */
export async function optionalAdmin(request: NextRequest): Promise<AdminDto | null> {
  const header = bearer(request);
  if (header) {
    const admin = await verify(header);
    if (!admin) throw unauthorized("Invalid or expired token");
    return admin;
  }
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookie || request.headers.get(ADMIN_REQUEST_HEADER) !== "1") return null;
  return verify(cookie);
}

export function setSessionCookie(response: NextResponse, token: string, maxAge: number): void {
  response.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: serverEnv().isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
