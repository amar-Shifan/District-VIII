import type { BookingDto } from "@district-viii/shared";
import * as webpush from "web-push";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestMongo, type TestMongo } from "../../test/mongo";
import { connectDb, disconnectDb } from "./db";
import { AdminDeviceSubscriptionModel } from "./models";
import { deliverBookingPush } from "./web-push";

const booking: BookingDto = {
  id: "000000000000000000000101",
  unitId: "000000000000000000000102",
  unitName: "PS5 1",
  unitType: "ps5",
  businessDate: "2026-11-01",
  startHour: 20,
  durationHours: 1,
  startsAt: "2026-11-01T14:30:00.000Z",
  endsAt: "2026-11-01T15:30:00.000Z",
  customerName: "Test Customer",
  customerPhone: "9876543210",
  pricePerHour: null,
  estimatedAmount: null,
  status: "pending",
  source: "online",
  rejectionReason: null,
  approvedAt: null,
  createdAt: "2026-10-29T10:00:00.000Z",
  updatedAt: "2026-10-29T10:00:00.000Z",
};

describe("Web Push delivery", () => {
  let mongo: TestMongo;
  const previousVapid = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  };

  beforeAll(async () => {
    mongo = await startTestMongo("web_push");
    await connectDb(mongo.uri);
    const vapid = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
    process.env.VAPID_SUBJECT = "mailto:push-test@example.com";
  });

  afterEach(async () => {
    await AdminDeviceSubscriptionModel.deleteMany({});
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (previousVapid.publicKey === undefined) delete process.env.VAPID_PUBLIC_KEY;
    else process.env.VAPID_PUBLIC_KEY = previousVapid.publicKey;
    if (previousVapid.privateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = previousVapid.privateKey;
    if (previousVapid.subject === undefined) delete process.env.VAPID_SUBJECT;
    else process.env.VAPID_SUBJECT = previousVapid.subject;
    await disconnectDb();
    await mongo?.stop();
  });

  it("removes subscriptions rejected as expired by the push service", async () => {
    await AdminDeviceSubscriptionModel.create({
      adminId: "000000000000000000000001",
      endpoint: "https://push.example.test/expired",
      keys: { p256dh: "p".repeat(65), auth: "a".repeat(24) },
    });
    const send = vi.fn<typeof webpush.sendNotification>().mockRejectedValue(Object.assign(new Error("gone"), { statusCode: 410 }));

    await expect(deliverBookingPush(booking, send)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await AdminDeviceSubscriptionModel.countDocuments()).toBe(0);
  });

  it("retries a transient push failure once without throwing into booking creation", async () => {
    await AdminDeviceSubscriptionModel.create({
      adminId: "000000000000000000000001",
      endpoint: "https://push.example.test/transient",
      keys: { p256dh: "p".repeat(65), auth: "a".repeat(24) },
    });
    const send = vi.fn<typeof webpush.sendNotification>().mockRejectedValue(
      Object.assign(new Error("temporary outage"), { statusCode: 503 }),
    );

    await expect(deliverBookingPush(booking, send)).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
    expect(await AdminDeviceSubscriptionModel.countDocuments()).toBe(1);
  });
});
