import { json, route } from "@/server/http";
import { getPublicSettings } from "@/server/services/settings";

/** Arena name, operating hours and booking window. */
export const GET = route(async () => json(await getPublicSettings()));
