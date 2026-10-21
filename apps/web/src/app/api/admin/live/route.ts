import { requireAdmin } from "@/server/auth";
import { now } from "@/server/clock";
import { json, parseQuery, route } from "@/server/http";
import { liveRevision } from "@/server/live";
import { pendingCreatedSince } from "@/server/services/bookings";
import { liveQuerySchema } from "@/server/validation";

/**
 * Polled by the admin panel: the live revision plus any pending requests
 * created since the last poll (shown as "new request" toasts).
 */
export const GET = route(async (request) => {
  await requireAdmin(request);
  const { since } = parseQuery(request, liveQuerySchema);
  const serverTime = now();
  const [revision, newRequests] = await Promise.all([
    liveRevision(),
    since ? pendingCreatedSince(new Date(since)) : Promise.resolve([]),
  ]);
  return json({ revision, newRequests, serverTime: serverTime.toISOString() });
});
