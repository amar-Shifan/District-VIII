import { requireAdmin } from "@/server/auth";
import { AdminDeviceSubscriptionModel } from "@/server/models";
import { noContent, json, parseBody, route } from "@/server/http";
import { getVapidConfig } from "@/server/web-push";
import { z } from "zod";

const endpoint = z.string().url().refine((value) => new URL(value).protocol === "https:", "endpoint must use HTTPS");
const subscriptionSchema = z.object({
  endpoint,
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(20).max(256), auth: z.string().min(16).max(128) }).strict(),
}).strict();
const removeSchema = z.object({ endpoint }).strict();

export const GET = route(async (request) => {
  await requireAdmin(request);
  return json({ vapidPublicKey: getVapidConfig()?.publicKey ?? null });
});

export const POST = route(async (request) => {
  const admin = await requireAdmin(request);
  const config = getVapidConfig();
  if (!config) return json({ message: "Device push is not configured on this server" }, 503);
  const subscription = await parseBody(request, subscriptionSchema);
  await AdminDeviceSubscriptionModel.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        adminId: admin.id,
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: subscription.keys,
      },
    },
    { upsert: true },
  ).exec();
  return noContent();
});

export const DELETE = route(async (request) => {
  const admin = await requireAdmin(request);
  const { endpoint: subscriptionEndpoint } = await parseBody(request, removeSchema);
  await AdminDeviceSubscriptionModel.deleteOne({ adminId: admin.id, endpoint: subscriptionEndpoint }).exec();
  return noContent();
});
