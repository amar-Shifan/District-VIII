import { requireAdmin } from "@/server/auth";
import { json, notFound, parseQuery, route } from "@/server/http";
import { bookingsPerDay, dashboardStats, estimatedSalesLastSevenDays, peakHours, statusSplit, usageByType } from "@/server/services/dashboard";
import { daysQuerySchema, emptyQuerySchema } from "@/server/validation";

/**
 * stats, bookings-per-day (default 7 days), peak-hours, usage-by-type and
 * status-split (default 30 days), all built with MongoDB aggregation pipelines.
 */
export const GET = route<RouteContext<"/api/admin/dashboard/[metric]">>(async (request, context) => {
  await requireAdmin(request);
  const { metric } = await context.params;
  if (metric === "estimated-sales") {
    parseQuery(request, emptyQuerySchema);
    return json(await estimatedSalesLastSevenDays());
  }
  const { days } = parseQuery(request, daysQuerySchema);
  switch (metric) {
    case "stats":
      return json(await dashboardStats());
    case "bookings-per-day":
      return json(await bookingsPerDay(days ?? 7));
    case "peak-hours":
      return json(await peakHours(days ?? 30));
    case "usage-by-type":
      return json(await usageByType(days ?? 30));
    case "status-split":
      return json(await statusSplit(days ?? 30));
    default:
      throw notFound("Unknown dashboard metric");
  }
});
