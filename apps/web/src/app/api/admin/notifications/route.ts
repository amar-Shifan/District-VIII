import { requireAdmin } from "@/server/auth";
import { json, noContent, objectId, parseBody, route } from "@/server/http";
import { listAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from "@/server/services/admin-notifications";
import { z } from "zod";

const readSchema = z.object({ id: z.string().optional(), all: z.boolean().optional() }).refine(
  (value) => Boolean(value.id) !== Boolean(value.all),
  "Provide either an id or all: true",
);

export const GET = route(async (request) => {
  const admin = await requireAdmin(request);
  return json(await listAdminNotifications(admin));
});

export const PATCH = route(async (request) => {
  const admin = await requireAdmin(request);
  const input = await parseBody(request, readSchema);
  if (input.all) await markAllAdminNotificationsRead(admin);
  else await markAdminNotificationRead(objectId(input.id!), admin);
  return noContent();
});
