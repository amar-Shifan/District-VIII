import { requireAdmin } from "@/server/auth";
import { json, objectId, route } from "@/server/http";
import { toggleFood } from "@/server/services/food";

export const PATCH = route<RouteContext<"/api/admin/food/[id]/toggle">>(async (request, context) => {
  await requireAdmin(request);
  return json(await toggleFood(objectId((await context.params).id)));
});
