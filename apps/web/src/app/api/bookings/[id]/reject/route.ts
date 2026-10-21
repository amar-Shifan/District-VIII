import { requireAdmin } from "@/server/auth";
import { json, objectId, parseBody, route } from "@/server/http";
import { rejectBooking } from "@/server/services/bookings";
import { rejectBookingSchema } from "@/server/validation";

export const PATCH = route<RouteContext<"/api/bookings/[id]/reject">>(async (request, context) => {
  await requireAdmin(request);
  const id = objectId((await context.params).id);
  const { reason } = await parseBody(request, rejectBookingSchema);
  return json(await rejectBooking(id, reason));
});
