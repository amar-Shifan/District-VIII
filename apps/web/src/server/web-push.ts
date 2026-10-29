import "server-only";

import { after } from "next/server";
import * as webpush from "web-push";
import type { BookingDto } from "@district-viii/shared";
import { AdminDeviceSubscriptionModel } from "./models";

interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey && !privateKey && !subject) return null;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be configured");
  }
  return { publicKey, privateKey, subject };
}

export function scheduleBookingPush(booking: BookingDto): void {
  try {
    after(async () => {
      try {
        await deliverBookingPush(booking);
      } catch (error) {
        console.error(`Could not send device notification for booking ${booking.id}`, error);
      }
    });
  } catch (error) {
    // Tests and non-request callers may not have a Next.js after() scope.
    void deliverBookingPush(booking).catch((deliveryError: unknown) => {
      console.error(`Could not send device notification for booking ${booking.id}`, deliveryError ?? error);
    });
  }
}

export async function deliverBookingPush(
  booking: BookingDto,
  send: typeof webpush.sendNotification = webpush.sendNotification,
): Promise<void> {
  const config = getVapidConfig();
  if (!config) return;

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const subscriptions = await AdminDeviceSubscriptionModel.find().lean().exec();
  const typeName = booking.unitType === "pool" ? "8 Ball Pool" : booking.unitType.toUpperCase();
  const statusFilter = booking.status === "pending" ? "?status=pending" : "";
  const payload = JSON.stringify({
    title: `New ${typeName} Booking`,
    body: `A customer booked ${booking.unitName} for ${booking.businessDate} at ${String(booking.startHour).padStart(2, "0")}:00. Tap to view booking details.`,
    url: `/admin/bookings${statusFilter}`,
    bookingId: booking.id,
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const pushSubscription: webpush.PushSubscription = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: subscription.keys,
      };

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await send(pushSubscription, payload, { TTL: 60 * 60, timeout: 2500, urgency: "high" });
          return;
        } catch (error) {
          const statusCode =
            typeof error === "object" && error !== null && "statusCode" in error && typeof error.statusCode === "number"
              ? error.statusCode
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await AdminDeviceSubscriptionModel.deleteOne({ _id: subscription._id }).exec().catch(() => undefined);
            return;
          }
          const retryable = statusCode === 0 || statusCode === 429 || statusCode >= 500;
          if (attempt === 0 && retryable) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            continue;
          }
          console.error(`Web Push delivery failed (${statusCode || "network"}) for booking ${booking.id}`);
          return;
        }
      }
    }),
  );
}
