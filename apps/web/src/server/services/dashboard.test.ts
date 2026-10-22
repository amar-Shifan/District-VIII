import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestMongo, type TestMongo } from "../../../test/mongo";
import { setClock } from "../clock";
import { connectDb, disconnectDb } from "../db";
import { UnitModel } from "../models";
import { dashboardStats } from "./dashboard";
import { clearSettingsCache } from "./settings";

/** IST wall-clock time on 22 Oct 2026. */
const ist = (hour: number) => new Date(Date.UTC(2026, 9, 22, hour, 0) - 330 * 60_000);

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
    });
  });

  it("works during opening hours", async () => {
    setClock(() => ist(20));
    await expect(dashboardStats()).resolves.toMatchObject({ unitsInUse: 0, totalUnits: 2 });
  });
});
