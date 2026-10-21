import { json, parseQuery, route } from "@/server/http";
import { listPublicFood } from "@/server/services/food";
import { foodQuerySchema } from "@/server/validation";

/** Available menu items (no prices). */
export const GET = route(async (request) => {
  const { category } = parseQuery(request, foodQuerySchema);
  return json(await listPublicFood(category));
});
