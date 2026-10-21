import { requireAdmin } from "@/server/auth";
import { json, noContent, objectId, parseBody, route } from "@/server/http";
import { unblockSlot, updateBlockedSlot } from "@/server/services/slots";
import { updateBlockedSlotSchema } from "@/server/validation";

export const PATCH = route<RouteContext<"/api/admin/slots/[id]">>(async (request, context) => {
  await requireAdmin(request);
  const id = objectId((await context.params).id);
  const { reason } = await parseBody(request, updateBlockedSlotSchema);
  return json(await updateBlockedSlot(id, reason));
});

export const DELETE = route<RouteContext<"/api/admin/slots/[id]">>(async (request, context) => {
  await requireAdmin(request);
  await unblockSlot(objectId((await context.params).id));
  return noContent();
});
