import { requireAdmin } from "@/server/auth";
import { json, parseBody, route } from "@/server/http";
import { getSettings, updateSettings } from "@/server/services/settings";
import { updateSettingsSchema } from "@/server/validation";

export const GET = route(async (request) => {
  await requireAdmin(request);
  return json(await getSettings());
});

export const PUT = route(async (request) => {
  await requireAdmin(request);
  return json(await updateSettings(await parseBody(request, updateSettingsSchema)));
});
