import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestMongo, type TestMongo } from "../../../test/mongo";
import { setClock } from "../clock";
import { connectDb, disconnectDb } from "../db";
import { BookingModel, UnitModel } from "../models";
import { dashboardStats, estimatedSalesLastSevenDays } from "./dashboard";
import { clearSettingsCache } from "./settings";

/** IST wall-clock time on 22 Oct 2026. */
const ist = (hour: number) => new Date(Date.UTC(2026, 9, 22, hour, 0) - 330 * 60_000);
const istOn = (day: number, hour: number) => new Date(Date.UTC(2026, 9, day, hour, 0) - 330 * 60_000);

describe("dashboard stats", () => {
  let mongo: TestMongo;

  beforeAll(async () => {
    mongo = await startTestMongo("dashboard");
    await connectDb(mongo.uri);
    clearSettingsCache();
    await UnitModel.create([
      { name: "Table 1", type: "pool" },
      { name: "PS5 #1", type: "ps5", status: "busy", busyUntil: ist(11) },
    ]);
  });

  afterAll(async () => {
    setClock(null);
    await disconnectDb();
    await mongo?.stop();
  });

  it("works while the arena is closed (no running slot)", async () => {
    setClock(() => ist(10)); // 10 AM: between closing (4 AM) and opening (12 PM)
    await expect(dashboardStats()).resolves.toEqual({
      todayBookings: 0,
      pendingCount: 0,
      approvedToday: 0,
      unitsInUse: 1, // PS5 #1 is still busy until 11 AM
      totalUnits: 2,
      estimatedBookingValueToday: 0,
      unpricedApprovedToday: 0,
    });
  });

  it("works during opening hours", async () => {
    setClock(() => ist(20));
    await expect(dashboardStats()).resolves.toMatchObject({ unitsInUse: 0, totalUnits: 2 });
  });

  it("sums estimated value for approved bookings only", async () => {
    const [pool, ps5] = await UnitModel.find().sort({ type: 1, name: 1 }).exec();
    await BookingModel.create([
      {
        unitId: ps5._id,
        unitType: "ps5",
        businessDate: "2026-10-22",
        startHour: 20,
        durationHours: 1,
        startsAt: ist(20),
        customerName: "Approved with estimate",
        customerPhone: "9876543210",
        pricePerHour: 51,
        estimatedAmount: 51,
        status: "approved",
        source: "walk-in",
      },
      {
        unitId: pool._id,
        unitType: "pool",
        businessDate: "2026-10-22",
        startHour: 20,
        durationHours: 1,
        startsAt: ist(20),
        customerName: "Pending estimate",
        customerPhone: "9876543211",
        pricePerHour: 20,
        estimatedAmount: 20,
        status: "pending",
        source: "online",
      },
    ]);
    setClock(() => ist(20));
    await expect(dashboardStats()).resolves.toMatchObject({
      approvedToday: 1,
      estimatedBookingValueToday: 51,
      unpricedApprovedToday: 0,
    });
    let sales = await estimatedSalesLastSevenDays();
    expect(sales[6]).toMatchObject({ estimatedBookingValue: 51, bookingCount: 1, missingEstimateCount: 0 });
    await BookingModel.create({
      unitId: pool._id,
      unitType: "pool",
      businessDate: "2026-10-22",
      startHour: 21,
      durationHours: 1,
      startsAt: ist(21),
      customerName: "Second approved estimate",
      customerPhone: "9876543213",
      pricePerHour: 20,
      estimatedAmount: 20,
      status: "approved",
      source: "walk-in",
    });
    await expect(dashboardStats()).resolves.toMatchObject({
      approvedToday: 2,
      estimatedBookingValueToday: 71,
      unpricedApprovedToday: 0,
    });
    await BookingModel.create({
      unitId: pool._id,
      unitType: "pool",
      businessDate: "2026-10-22",
      startHour: 22,
      durationHours: 1,
      startsAt: ist(22),
      customerName: "Legacy booking without an estimate",
      customerPhone: "9876543212",
      status: "approved",
      source: "walk-in",
    });
    await expect(dashboardStats()).resolves.toMatchObject({
      estimatedBookingValueToday: null,
      unpricedApprovedToday: 1,
    });

    sales = await estimatedSalesLastSevenDays();
    expect(sales).toHaveLength(7);
    expect(sales.map((day) => day.date)).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
    ]);
    expect(sales.slice(0, 6).every((day) => day.estimatedBookingValue === 0 && day.bookingCount === 0)).toBe(true);
    expect(sales[6]).toMatchObject({ estimatedBookingValue: null, bookingCount: 3, missingEstimateCount: 1 });

    await BookingModel.create([
      {
        unitId: pool._id,
        unitType: "pool",
        businessDate: "2026-10-22",
        startHour: 19,
        durationHours: 1,
        startsAt: ist(19),
        customerName: "Rejected booking",
        customerPhone: "9876543216",
        pricePerHour: 90,
        estimatedAmount: 90,
        status: "rejected",
        source: "online",
      },
      {
        unitId: pool._id,
        unitType: "pool",
        businessDate: "2026-10-22",
        startHour: 23,
        durationHours: 1,
        startsAt: ist(23),
        customerName: "Cancelled booking",
        customerPhone: "9876543217",
        pricePerHour: 80,
        estimatedAmount: 80,
        status: "cancelled",
        source: "online",
      },
    ]);
    expect((await estimatedSalesLastSevenDays())[6]).toMatchObject({ bookingCount: 3, missingEstimateCount: 1 });

    // The daily bucket follows the arena's calendar date even when the slot
    // starts shortly after midnight and belongs to the previous business date.
    await BookingModel.create({
      unitId: ps5._id,
      unitType: "ps5",
      businessDate: "2026-10-21",
      startHour: 0,
      durationHours: 1,
      startsAt: new Date(Date.UTC(2026, 9, 21, 18, 45)), // 22 Oct, 00:15 in Asia/Kolkata
      customerName: "After midnight estimate",
      customerPhone: "9876543214",
      pricePerHour: 11,
      estimatedAmount: 11,
      status: "approved",
      source: "walk-in",
    });
    const afterMidnightSales = await estimatedSalesLastSevenDays();
    expect(afterMidnightSales[6]).toMatchObject({ bookingCount: 4, missingEstimateCount: 1, estimatedBookingValue: null });

    const pending = await BookingModel.create({
      unitId: ps5._id,
      unitType: "ps5",
      businessDate: "2026-10-21",
      startHour: 20,
      durationHours: 1,
      startsAt: istOn(21, 20),
      customerName: "Status change estimate",
      customerPhone: "9876543215",
      pricePerHour: 12,
      estimatedAmount: 12,
      status: "pending",
      source: "online",
    });
    let priorDay = await estimatedSalesLastSevenDays();
    expect(priorDay[5]).toMatchObject({ bookingCount: 0, estimatedBookingValue: 0 });
    await BookingModel.findByIdAndUpdate(pending._id, { $set: { status: "approved" } }).exec();
    priorDay = await estimatedSalesLastSevenDays();
    expect(priorDay[5]).toMatchObject({ bookingCount: 1, estimatedBookingValue: 12 });
    // Re-reading does not double count a booking; cancellation removes it from eligible sales.
    expect(await estimatedSalesLastSevenDays()).toEqual(priorDay);
    await BookingModel.findByIdAndUpdate(pending._id, { $set: { status: "cancelled" } }).exec();
    priorDay = await estimatedSalesLastSevenDays();
    expect(priorDay[5]).toMatchObject({ bookingCount: 0, estimatedBookingValue: 0 });
  });
});
