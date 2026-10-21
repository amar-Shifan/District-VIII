import { json, parseQuery, route } from "@/server/http";
import { getAvailability } from "@/server/services/availability";
import { availabilityQuerySchema } from "@/server/validation";

/** Hourly slot grid for every active unit of a type on one business date. */
export const GET = route(async (request) => {
  const { type, date } = parseQuery(request, availabilityQuerySchema);
  return json(await getAvailability(type, date));
});
