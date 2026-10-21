import { requireAdmin } from "@/server/auth";
import { json, noContent, objectId, parseBody, route } from "@/server/http";
import { deleteUnit, updateUnit } from "@/server/services/units";
import { updateUnitSchema } from "@/server/validation";

export const PATCH = route<RouteContext<"/api/units/[id]">>(async (request, context) => {
  await requireAdmin(request);
  const id = objectId((await context.params).id);
  return json(await updateUnit(id, await parseBody(request, updateUnitSchema)));
});

export const DELETE = route<RouteContext<"/api/units/[id]">>(async (request, context) => {
  await requireAdmin(request);
  await deleteUnit(objectId((await context.params).id));
  return noContent();
});
