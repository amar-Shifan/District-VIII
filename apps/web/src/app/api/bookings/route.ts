import { requireAdmin } from "@/server/auth";
import { json, parseBody, parseQuery, rateLimit, route } from "@/server/http";
import { createBooking, listBookings } from "@/server/services/bookings";
import { createBookingSchema, listBookingsQuerySchema } from "@/server/validation";

/** Admin list with filters, search, sorting and pagination. */
export const GET = route(async (request) => {
  await requireAdmin(request);
  return json(await listBookings(parseQuery(request, listBookingsQuerySchema)));
});

/** Customer booking request. Holds the slot as "pending" until an admin decides. */
export const POST = route(async (request) => {
  rateLimit(request, "bookings:create", 10);
  return json(await createBooking(await parseBody(request, createBookingSchema), "online"), 201);
});
