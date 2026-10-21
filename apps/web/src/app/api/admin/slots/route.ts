import { requireAdmin } from "@/server/auth";
import { json, parseBody, parseQuery, route } from "@/server/http";
import { blockSlot, listBlockedSlots } from "@/server/services/slots";
import { createBlockedSlotSchema, listBlockedSlotsQuerySchema } from "@/server/validation";

/** Hours an admin has blocked. The availability grid shows them as unavailable. */
export const GET = route(async (request) => {
  await requireAdmin(request);
  return json(await listBlockedSlots(parseQuery(request, listBlockedSlotsQuerySchema)));
});

export const POST = route(async (request) => {
  await requireAdmin(request);
  return json(await blockSlot(await parseBody(request, createBlockedSlotSchema)), 201);
});
