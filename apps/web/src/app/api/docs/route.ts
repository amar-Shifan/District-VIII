import { NextResponse } from "next/server";
import { openApiDocument } from "@/server/openapi";

/** OpenAPI JSON for every /api route (rendered at /docs). */
export function GET() {
  return NextResponse.json(openApiDocument);
}
