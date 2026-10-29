import { addDays, businessDateOf } from "@district-viii/shared";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { startTestMongo, type TestMongo } from "../../../test/mongo";
import { connectDb, disconnectDb } from "../db";
import { HttpError } from "../http";
import { AdminBookingNotificationModel, BookingModel, DEFAULT_SETTINGS, UnitModel } from "../models";
import {
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  recordAdminBookingNotification,
} from "./admin-notifications";
import { approveBooking, cancelBooking, createBooking, rejectBooking, SLOT_TAKEN_MESSAGE } from "./bookings";
import { clearSettingsCache, getSettings, updateSettings } from "./settings";

describe("bookings service (double-booking protection)", () => {
  let mongo: TestMongo;
  let unitId: string;
  let ps5UnitId: string;
  const tomorrow = addDays(businessDateOf(new Date(), DEFAULT_SETTINGS), 1);

  const request = (startHour: number, phone = "9876543210") => ({
    unitId,
    businessDate: tomorrow,
    startHour,
    customerName: "Test Customer",
    customerPhone: phone,
  });

  const expectHttpError = async (promise: Promise<unknown>, status: number) => {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(status);
    return error as HttpError;
  };

  beforeAll(async () => {
    mongo = await startTestMongo("bookings");
    await connectDb(mongo.uri);
    clearSettingsCache();
    const unit = await UnitModel.create({ name: "Table 1", type: "pool" });
    unitId = String(unit._id);
    const ps5 = await UnitModel.create({ name: "PS5 1", type: "ps5" });
    ps5UnitId = String(ps5._id);
  });

  afterEach(async () => {
    await AdminBookingNotificationModel.deleteMany({});
    await BookingModel.deleteMany({});
  });

  afterAll(async () => {
    await disconnectDb();
    await mongo?.stop();
  });

  it("lets exactly one of many concurrent requests hold a slot", async () => {
    const attempts = Array.from({ length: 8 }, (_, index) =>
      createBooking(request(20, `98765432${String(index).padStart(2, "0")}`), "online"),
    );
    const results = await Promise.allSettled(attempts);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(HttpError);
      expect((result.reason as HttpError).status).toBe(409);
      expect((result.reason as HttpError).message).toBe(SLOT_TAKEN_MESSAGE);
    }
    expect(await BookingModel.countDocuments({ startHour: 20 })).toBe(1);
  });

  it("frees the slot when the hold is rejected or cancelled", async () => {
    const first = await createBooking(request(21), "online");
    await expectHttpError(createBooking(request(21), "online"), 409);

    await rejectBooking(first.id, "Reserved");
    expect((await AdminBookingNotificationModel.findOne({ bookingId: first.id }).lean().exec())?.booking.status).toBe("rejected");
    const second = await createBooking(request(21), "online");
    expect(second.status).toBe("pending");

    await cancelBooking(second.id, { phone: "9876543210" });
    expect((await AdminBookingNotificationModel.findOne({ bookingId: second.id }).lean().exec())?.booking.status).toBe("cancelled");
    await expect(createBooking(request(21), "online")).resolves.toMatchObject({ status: "pending" });
  });

  it("auto-approves walk-ins and still blocks a second hold", async () => {
    const walkIn = await createBooking(request(22), "walk-in");
    expect(walkIn.status).toBe("approved");
    expect(walkIn.approvedAt).not.toBeNull();
    await expectHttpError(createBooking(request(22), "online"), 409);
  });

  it("creates one persistent notification after successful pool and PS5 bookings", async () => {
    const poolBooking = await createBooking(request(18), "online");
    const ps5Booking = await createBooking({ ...request(19), unitId: ps5UnitId }, "online");
    const notifications = await AdminBookingNotificationModel.find().sort({ createdAt: 1 }).lean().exec();

    expect(notifications).toHaveLength(2);
    expect(notifications.map((item) => String(item.bookingId))).toEqual([poolBooking.id, ps5Booking.id]);
    expect(notifications[0]).toMatchObject({
      title: "New Booking Received",
      booking: { customerName: "Test Customer", unitType: "pool", status: "pending" },
      readBy: [],
    });
    expect(notifications[1].booking.unitType).toBe("ps5");
    expect(await recordAdminBookingNotification(poolBooking)).toBe(false);
    expect(await AdminBookingNotificationModel.countDocuments({ bookingId: poolBooking.id })).toBe(1);
  });

  it("uses the current hourly gaming rate for new bookings and preserves historical estimates", async () => {
    const previousSettings = await getSettings();
    try {
      await updateSettings({ slotDurationHours: 2, ps5PricePerHour: 100, poolPricePerHour: 10 });
      const firstPs5 = await createBooking({ ...request(18), unitId: ps5UnitId }, "online");
      expect(firstPs5).toMatchObject({ pricePerHour: 100, estimatedAmount: 200 });
      const approved = await approveBooking(firstPs5.id);
      expect(approved).toMatchObject({ status: "approved", pricePerHour: 100, estimatedAmount: 200 });

      await updateSettings({ ps5PricePerHour: 40 });
      const secondPs5 = await createBooking({ ...request(20), unitId: ps5UnitId }, "online");
      const pool = await createBooking(request(18), "walk-in");
      expect(secondPs5).toMatchObject({ pricePerHour: 40, estimatedAmount: 80 });
      expect(pool).toMatchObject({ pricePerHour: 10, estimatedAmount: 20, status: "approved" });

      const savedHistoricalBooking = await BookingModel.findById(firstPs5.id).lean().exec();
      expect(savedHistoricalBooking).toMatchObject({ pricePerHour: 100, estimatedAmount: 200 });
    } finally {
      await updateSettings({
        slotDurationHours: previousSettings.slotDurationHours,
        ps5PricePerHour: previousSettings.ps5PricePerHour,
        poolPricePerHour: previousSettings.poolPricePerHour,
      });
    }
  });

  it("keeps a saved booking successful if push configuration or delivery fails", async () => {
    const previous = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT,
    };
    process.env.VAPID_PUBLIC_KEY = "partial-test-configuration";
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const booking = await createBooking(request(16), "online");
      expect(booking.status).toBe("pending");
      expect(await AdminBookingNotificationModel.countDocuments({ bookingId: booking.id })).toBe(1);
      expect(log).toHaveBeenCalledWith(expect.stringContaining("Could not send device notification"), expect.any(Error));
    } finally {
      if (previous.publicKey === undefined) delete process.env.VAPID_PUBLIC_KEY;
      else process.env.VAPID_PUBLIC_KEY = previous.publicKey;
      if (previous.privateKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
      else process.env.VAPID_PRIVATE_KEY = previous.privateKey;
      if (previous.subject === undefined) delete process.env.VAPID_SUBJECT;
      else process.env.VAPID_SUBJECT = previous.subject;
      log.mockRestore();
    }
  });

  it("does not create notifications for invalid or conflicting booking requests", async () => {
    await expectHttpError(createBooking(request(9), "online"), 400);
    await createBooking(request(20), "online");
    await expectHttpError(createBooking(request(20), "online"), 409);
    expect(await AdminBookingNotificationModel.countDocuments()).toBe(1);
  });

  it("tracks read state separately for each admin and persists mark-all changes", async () => {
    const booking = await createBooking(request(17), "online");
    const notification = await AdminBookingNotificationModel.findOne({ bookingId: booking.id }).lean().exec();
    expect(notification).not.toBeNull();
    const adminA = { id: "000000000000000000000001", email: "a@example.com", name: "Admin A" };
    const adminB = { id: "000000000000000000000002", email: "b@example.com", name: "Admin B" };

    await markAdminNotificationRead(String(notification!._id), adminA);
    expect(await listAdminNotifications(adminA)).toMatchObject({ unreadCount: 0, items: [{ isRead: true }] });
    expect(await listAdminNotifications(adminB)).toMatchObject({ unreadCount: 1, items: [{ isRead: false }] });
    await markAllAdminNotificationsRead(adminB);
    expect(await listAdminNotifications(adminB)).toMatchObject({ unreadCount: 0, items: [{ isRead: true }] });
  });

  it("rejects slots outside operating hours or the booking window", async () => {
    await expectHttpError(createBooking(request(9), "online"), 400);
    await expectHttpError(createBooking({ ...request(20), businessDate: addDays(tomorrow, 5) }, "online"), 400);
  });

  it("refuses a customer cancel with the wrong phone", async () => {
    const booking = await createBooking(request(23), "online");
    const error = await expectHttpError(cancelBooking(booking.id, { phone: "9000000000" }), 403);
    expect(error.message).toContain("different phone number");
  });
});
