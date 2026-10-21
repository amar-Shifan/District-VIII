import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_REQUEST_HEADER, apiBase, cookieOptions } from "@/lib/admin-session";

/**
 * Forwards admin calls to the NestJS API with the bearer token from the
 * httpOnly cookie. Mutations must carry the x-admin-request header (CSRF guard).
 */
async function forward(request: NextRequest, context: RouteContext<"/api/admin/proxy/[...path]">) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();

  if (method !== "GET" && request.headers.get(ADMIN_REQUEST_HEADER) !== "1") {
    return NextResponse.json({ statusCode: 403, message: "Missing admin request header" }, { status: 403 });
  }
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ statusCode: 401, message: "Not signed in" }, { status: 401 });
  }

  const target = new URL(`${apiBase()}/${path.map(encodeURIComponent).join("/")}`);
  target.search = request.nextUrl.search;
  const hasBody = method !== "GET" && method !== "DELETE";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ statusCode: 502, message: "The API is unreachable" }, { status: 502 });
  }

  const text = upstream.status === 204 ? null : await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
  if (upstream.status === 401) response.cookies.set(ADMIN_COOKIE, "", cookieOptions(0));
  return response;
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT };
