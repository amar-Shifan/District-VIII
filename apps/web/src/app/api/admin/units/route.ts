import { requireAdmin } from "@/server/auth";
import { json, route } from "@/server/http";
import { listAllUnits } from "@/server/services/units";

/** All units, including inactive ones. */
export const GET = route(async (request) => {
  await requireAdmin(request);
  return json(await listAllUnits());
});
