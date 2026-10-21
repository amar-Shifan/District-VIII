import { addDays, businessDateOf } from "@district-viii/shared";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { startTestMongo, type TestMongo } from "../../../test/mongo";
import { connectDb, disconnectDb } from "../db";
import { HttpError } from "../http";
import { BookingModel, DEFAULT_SETTINGS, UnitModel } from "../models";
import { cancelBooking, createBooking, rejectBooking, SLOT_TAKEN_MESSAGE } from "./bookings";
import { clearSettingsCache } from "./settings";

describe("bookings service (double-booking protection)", () => {
  let mongo: TestMongo;
  let unitId: string;
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
  });

  afterEach(async () => {
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
    const second = await createBooking(request(21), "online");
    expect(second.status).toBe("pending");

    await cancelBooking(second.id, { phone: "9876543210" });
    await expect(createBooking(request(21), "online")).resolves.toMatchObject({ status: "pending" });
  });

  it("auto-approves walk-ins and still blocks a second hold", async () => {
    const walkIn = await createBooking(request(22), "walk-in");
    expect(walkIn.status).toBe("approved");
    expect(walkIn.approvedAt).not.toBeNull();
    await expectHttpError(createBooking(request(22), "online"), 409);
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
