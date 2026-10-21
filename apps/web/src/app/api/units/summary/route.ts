import { json, route } from "@/server/http";
import { getUnitsSummary } from "@/server/services/availability";

/** Free units per type right now, with the next free time when none are free. */
export const GET = route(async () => json(await getUnitsSummary()));
