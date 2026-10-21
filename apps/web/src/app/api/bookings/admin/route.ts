import { requireAdmin } from "@/server/auth";
import { json, parseBody, route } from "@/server/http";
import { createBooking } from "@/server/services/bookings";
import { createBookingSchema } from "@/server/validation";

/** Walk-in or phone booking entered by an admin. Approved immediately. */
export const POST = route(async (request) => {
  await requireAdmin(request);
  return json(await createBooking(await parseBody(request, createBookingSchema), "walk-in"), 201);
});
