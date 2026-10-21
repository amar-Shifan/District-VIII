import { optionalAdmin } from "@/server/auth";
import { json, objectId, parseBody, rateLimit, route } from "@/server/http";
import { cancelBooking } from "@/server/services/bookings";
import { cancelBookingSchema } from "@/server/validation";

/**
 * Customers cancel their own pending booking by sending the matching phone.
 * Admins (session plus x-admin-request header, or a Bearer token) may cancel
 * pending or approved bookings.
 */
export const PATCH = route<RouteContext<"/api/bookings/[id]/cancel">>(async (request, context) => {
  rateLimit(request, "bookings:cancel", 10);
  const id = objectId((await context.params).id);
  const admin = await optionalAdmin(request);
  const { phone } = await parseBody(request, cancelBookingSchema);
  return json(await cancelBooking(id, { admin, phone }));
});
