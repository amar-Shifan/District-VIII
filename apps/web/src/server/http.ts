import "server-only";

import type { ApiErrorBody } from "@district-viii/shared";
import { Error as MongooseError, isValidObjectId } from "mongoose";
import { connection, type NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { connectDb } from "./db";

// ---------- Errors ----------

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
  ) {
    super(message);
  }
}

export const badRequest = (message: string, details?: string[]) => new HttpError(400, message, details);
export const unauthorized = (message = "Unauthorized") => new HttpError(401, message);
export const forbidden = (message: string) => new HttpError(403, message);
export const notFound = (message: string) => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

function zodDetails(error: ZodError): string[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") return issue.keys.map((key) => `property ${key} should not exist`);
    const path = issue.path.join(".");
    return [path ? `${path}: ${issue.message}` : issue.message];
  });
}

function describe(error: unknown): { status: number; message: string; details?: string[] } {
  if (error instanceof HttpError) return { status: error.status, message: error.message, details: error.details };
  if (error instanceof ZodError) return { status: 400, message: "Validation failed", details: zodDetails(error) };
  if (isDuplicateKeyError(error)) return { status: 409, message: "This record already exists" };
  if (error instanceof MongooseError.CastError) return { status: 400, message: "Invalid identifier" };
  if (error instanceof MongooseError.ValidationError) {
    return { status: 400, message: "Validation failed", details: Object.values(error.errors).map((item) => item.message) };
  }
  return { status: 500, message: "Something went wrong" };
}

export function errorResponse(error: unknown, request: NextRequest): NextResponse {
  const { status, message, details } = describe(error);
  if (status >= 500) {
    // Never log request bodies or params: they can contain phone numbers.
    console.error(`${request.method} ${request.nextUrl.pathname} failed`, error);
  }
  const body: ApiErrorBody = {
    statusCode: status,
    error: STATUS_TEXT[status] ?? "Error",
    message,
    ...(details && details.length > 0 ? { details } : {}),
    path: request.nextUrl.pathname,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

// ---------- Rate limiting ----------

/**
 * Fixed-window limiter in instance memory. On Vercel each warm instance keeps
 * its own counters, so limits are per instance: enough to blunt abuse of login
 * and booking forms without an extra service.
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function rateLimit(request: NextRequest, bucket: string, limit: number, windowMs = 60_000): void {
  const key = `${bucket}:${clientIp(request)}`;
  const time = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt <= time) {
    windows.set(key, { count: 1, resetAt: time + windowMs });
    if (windows.size > 5000) {
      for (const [stale, value] of windows) if (value.resetAt <= time) windows.delete(stale);
    }
    return;
  }
  entry.count += 1;
  if (entry.count > limit) throw new HttpError(429, "Too many requests. Please wait a minute and try again.");
}

/** For tests. */
export function resetRateLimits(): void {
  windows.clear();
}

// ---------- Route wrapper ----------

type Handler<C> = (request: NextRequest, context: C) => Promise<Response>;

/** Generous per-IP default for every API route; stricter limits are applied per route. */
const DEFAULT_LIMIT_PER_MINUTE = 240;

/**
 * Wraps a route handler: always dynamic (never prerendered), connected to
 * MongoDB, rate limited, and with every error in the ApiErrorBody shape.
 */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    await connection();
    try {
      rateLimit(request, "default", DEFAULT_LIMIT_PER_MINUTE);
      await connectDb();
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error, request);
    }
  };
}

export const json = <T>(data: T, status = 200) => NextResponse.json(data, { status });
export const noContent = () => new NextResponse(null, { status: 204 });

// ---------- Parsing ----------

export function parse<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  const text = await request.text();
  let value: unknown = {};
  if (text) {
    try {
      value = JSON.parse(text);
    } catch {
      throw badRequest("Request body must be valid JSON");
    }
  }
  return schema.parse(value);
}

export function parseQuery<T>(request: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(request.nextUrl.searchParams));
}

export function objectId(value: string): string {
  if (!isValidObjectId(value) || !/^[a-f\d]{24}$/i.test(value)) throw badRequest("Invalid id");
  return value;
}
