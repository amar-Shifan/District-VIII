import { json, route } from "@/server/http";
import { liveRevision } from "@/server/live";

/** Polled by customer screens: refetch when the revision moves. */
export const GET = route(async () => json({ revision: await liveRevision() }));
