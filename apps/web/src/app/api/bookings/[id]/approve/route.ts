import { requireAdmin } from "@/server/auth";
import { json, objectId, route } from "@/server/http";
import { approveBooking } from "@/server/services/bookings";

export const PATCH = route<RouteContext<"/api/bookings/[id]/approve">>(async (request, context) => {
  await requireAdmin(request);
  return json(await approveBooking(objectId((await context.params).id)));
});
