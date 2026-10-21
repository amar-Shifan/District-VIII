import { requireAdmin } from "@/server/auth";
import { json, objectId, parseBody, route } from "@/server/http";
import { updateUnitStatus } from "@/server/services/units";
import { updateUnitStatusSchema } from "@/server/validation";

/** Free, busy (with busyUntil) or maintenance. */
export const PATCH = route<RouteContext<"/api/units/[id]/status">>(async (request, context) => {
  await requireAdmin(request);
  const id = objectId((await context.params).id);
  return json(await updateUnitStatus(id, await parseBody(request, updateUnitStatusSchema)));
});
