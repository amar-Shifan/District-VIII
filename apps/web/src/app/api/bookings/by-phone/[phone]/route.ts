import { normalizePhone } from "@district-viii/shared";
import { badRequest, json, rateLimit, route } from "@/server/http";
import { bookingsByPhone } from "@/server/services/bookings";

/** A customer's recent and upcoming bookings. */
export const GET = route<RouteContext<"/api/bookings/by-phone/[phone]">>(async (request, context) => {
  rateLimit(request, "bookings:by-phone", 20);
  const phone = normalizePhone(decodeURIComponent((await context.params).phone));
  if (!phone) throw badRequest("Enter a 10-digit Indian mobile number");
  return json(await bookingsByPhone(phone));
});
