/**
 * Wipes and reseeds the database at MONGODB_URI with demo data and the admin
 * account. Run with `npm run seed` (reads apps/web/.env.local).
 */
import { addDays, type BookingStatus, businessDateOf, isSlotPast, slotHours, slotStart } from "@district-viii/shared";
import { loadEnvConfig } from "@next/env";
import { hashPassword } from "@/server/auth";
import { connectDb, disconnectDb } from "@/server/db";
import {
  AdminModel,
  BlockedSlotModel,
  type Booking,
  BookingModel,
  DEFAULT_SETTINGS,
  FoodItemModel,
  LiveStateModel,
  SettingsModel,
  UnitModel,
  type UnitRecord,
} from "@/server/models";
import {
  SEED_BUSY_MINUTES,
  SEED_CUSTOMERS,
  SEED_FOOD,
  SEED_HOUR_WEIGHTS,
  SEED_REJECTION_REASONS,
  SEED_UNITS,
} from "./seed-data";

loadEnvConfig(process.cwd());

const PAST_BOOKINGS = 25;

/** Deterministic PRNG so every seed produces the same demo data. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) {
    throw new Error("Refusing to wipe a production database. Pass --force if you really mean it.");
  }
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!process.env.MONGODB_URI) throw new Error("Set MONGODB_URI in apps/web/.env.local");
  if (!email || !password || password.length < 12) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters) in apps/web/.env.local");
  }

  await connectDb(process.env.MONGODB_URI);
  try {
    await Promise.all([
      UnitModel.deleteMany({}),
      BookingModel.deleteMany({}),
      FoodItemModel.deleteMany({}),
      SettingsModel.deleteMany({}),
      AdminModel.deleteMany({}),
      BlockedSlotModel.deleteMany({}),
      LiveStateModel.deleteMany({}),
    ]);

    await SettingsModel.create({ ...DEFAULT_SETTINGS });
    const hours = { ...DEFAULT_SETTINGS };
    const now = new Date();

    const createdUnits = (await UnitModel.insertMany(
      SEED_UNITS.map((unit) => {
        const busyMinutes = SEED_BUSY_MINUTES[unit.name];
        return busyMinutes
          ? { ...unit, status: "busy", busyUntil: new Date(now.getTime() + busyMinutes * 60_000) }
          : { ...unit, status: "free", busyUntil: null };
      }),
    )) as unknown as UnitRecord[];

    await FoodItemModel.insertMany(SEED_FOOD);

    await AdminModel.create({
      email: email.toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? "Arena Manager",
      passwordHash: await hashPassword(password),
    });

    // ---- Bookings: ~25 over the last 7 days plus a few upcoming requests ----
    const random = createRandom(8);
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
    const phoneFor = (index: number) => `9${String(846_000_000 + index * 7_919).padStart(9, "0")}`;
    const weighted = slotHours(hours).flatMap((hour) => Array<number>(SEED_HOUR_WEIGHTS[hour] ?? 1).fill(hour));
    const today = businessDateOf(now, hours);
    const used = new Set<string>();
    const docs: Partial<Booking>[] = [];

    const addBooking = (businessDate: string, startHour: number, status: BookingStatus) => {
      const unit = pick(createdUnits);
      const key = `${String(unit._id)}|${businessDate}|${startHour}`;
      if (used.has(key)) return;
      used.add(key);
      const startsAt = slotStart(businessDate, startHour, hours);
      const customer = Math.floor(random() * SEED_CUSTOMERS.length);
      docs.push({
        unitId: unit._id,
        unitType: unit.type,
        businessDate,
        startHour,
        durationHours: hours.slotDurationHours,
        startsAt,
        customerName: SEED_CUSTOMERS[customer],
        customerPhone: phoneFor(customer),
        status,
        source: random() < 0.25 ? "walk-in" : "online",
        rejectionReason: status === "rejected" ? pick(SEED_REJECTION_REASONS) : null,
        approvedAt: status === "approved" ? new Date(startsAt.getTime() - 3 * 3_600_000) : null,
      });
    };

    let attempts = 0;
    while (docs.length < PAST_BOOKINGS && attempts < 500) {
      attempts += 1;
      const businessDate = addDays(today, -Math.floor(random() * 7));
      const startHour = pick(weighted);
      if (!isSlotPast(slotStart(businessDate, startHour, hours), now)) continue;
      const roll = random();
      addBooking(businessDate, startHour, roll < 0.62 ? "approved" : roll < 0.8 ? "rejected" : "cancelled");
    }

    // Upcoming requests so the admin "Pending requests" panel and customer grids have content.
    const upcoming: [number, number, BookingStatus][] = [
      [0, 21, "pending"],
      [0, 22, "approved"],
      [0, 23, "pending"],
      [1, 19, "pending"],
      [1, 20, "approved"],
      [2, 21, "pending"],
    ];
    for (const [dayOffset, startHour, status] of upcoming) {
      const businessDate = addDays(today, dayOffset);
      if (!isSlotPast(slotStart(businessDate, startHour, hours), now)) addBooking(businessDate, startHour, status);
    }

    await BookingModel.insertMany(docs);

    console.log(`Units: ${createdUnits.length} (${Object.keys(SEED_BUSY_MINUTES).join(", ")} busy)`);
    console.log(`Food items: ${SEED_FOOD.length} in 4 categories`);
    console.log(`Bookings: ${docs.length}`);
    console.log(`Admin: ${email} (password from SEED_ADMIN_PASSWORD)`);
  } finally {
    await disconnectDb();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exit(1);
  });
