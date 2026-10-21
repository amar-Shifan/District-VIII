import { requireAdmin } from "@/server/auth";
import { json, parseBody, route } from "@/server/http";
import { createUnit, listPublicUnits } from "@/server/services/units";
import { createUnitSchema } from "@/server/validation";

/** Active units with their live status. */
export const GET = route(async () => json(await listPublicUnits()));

export const POST = route(async (request) => {
  await requireAdmin(request);
  return json(await createUnit(await parseBody(request, createUnitSchema)), 201);
});
