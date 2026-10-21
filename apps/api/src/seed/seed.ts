import {
  addDays,
  type BookingStatus,
  businessDateOf,
  isSlotPast,
  slotHours,
  slotStart,
} from '@district-viii/shared';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Admin } from '../auth/admin.schema';
import { hashPassword } from '../auth/auth.service';
import { Booking } from '../bookings/booking.schema';
import { FoodItem } from '../food/food-item.schema';
import { DEFAULT_SETTINGS, Settings } from '../settings/settings.schema';
import { BlockedSlot } from '../slots/blocked-slot.schema';
import { Unit, type UnitRecord } from '../units/unit.schema';
import {
  SEED_BUSY_MINUTES,
  SEED_CUSTOMERS,
  SEED_FOOD,
  SEED_HOUR_WEIGHTS,
  SEED_REJECTION_REASONS,
  SEED_UNITS,
} from './seed-data';

const logger = new Logger('Seed');
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
  if (
    process.env.NODE_ENV === 'production' &&
    !process.argv.includes('--force')
  ) {
    throw new Error(
      'Refusing to wipe a production database. Pass --force if you really mean it.',
    );
  }
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters) in apps/api/.env',
    );
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
    const units = model<Unit>(Unit.name);
    const bookings = model<Booking>(Booking.name);
    const food = model<FoodItem>(FoodItem.name);
    const settings = model<Settings>(Settings.name);
    const admins = model<Admin>(Admin.name);
    const blocked = model<BlockedSlot>(BlockedSlot.name);

    await Promise.all([
      units.deleteMany({}),
      bookings.deleteMany({}),
      food.deleteMany({}),
      settings.deleteMany({}),
      admins.deleteMany({}),
      blocked.deleteMany({}),
    ]);
    await bookings.createIndexes();

    await settings.create({ ...DEFAULT_SETTINGS });
    const hours = { ...DEFAULT_SETTINGS };
    const now = new Date();

    const createdUnits = (await units.insertMany(
      SEED_UNITS.map((unit) => {
        const busyMinutes = SEED_BUSY_MINUTES[unit.name];
        return busyMinutes
          ? {
              ...unit,
              status: 'busy',
              busyUntil: new Date(now.getTime() + busyMinutes * 60_000),
            }
          : { ...unit, status: 'free', busyUntil: null };
      }),
    )) as unknown as UnitRecord[];

    await food.insertMany(SEED_FOOD);

    await admins.create({
      email: email.toLowerCase(),
      name: process.env.SEED_ADMIN_NAME ?? 'Arena Manager',
      passwordHash: await hashPassword(password),
    });

    // ---- Bookings: ~25 over the last 7 days plus a few upcoming requests ----
    const random = createRandom(8);
    const pick = <T>(items: readonly T[]): T =>
      items[Math.floor(random() * items.length)];
    const phoneFor = (index: number) =>
      `9${String(846_000_000 + index * 7_919).padStart(9, '0')}`;
    const operating = slotHours(hours);
    const weighted = operating.flatMap((hour) =>
      Array<number>(SEED_HOUR_WEIGHTS[hour] ?? 1).fill(hour),
    );
    const today = businessDateOf(now, hours);
    const used = new Set<string>();
    const docs: Partial<Booking>[] = [];

    const addBooking = (
      businessDate: string,
      startHour: number,
      status: BookingStatus,
    ) => {
      const unit = pick(createdUnits);
      const key = `${String(unit._id)}|${businessDate}|${startHour}`;
      if (used.has(key)) return false;
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
        source: random() < 0.25 ? 'walk-in' : 'online',
        rejectionReason:
          status === 'rejected' ? pick(SEED_REJECTION_REASONS) : null,
        approvedAt:
          status === 'approved'
            ? new Date(startsAt.getTime() - 3 * 3_600_000)
            : null,
      });
      return true;
    };

    let attempts = 0;
    while (docs.length < PAST_BOOKINGS && attempts < 500) {
      attempts += 1;
      const businessDate = addDays(today, -Math.floor(random() * 7));
      const startHour = pick(weighted);
      if (!isSlotPast(slotStart(businessDate, startHour, hours), now)) continue;
      const roll = random();
      const status: BookingStatus =
        roll < 0.62 ? 'approved' : roll < 0.8 ? 'rejected' : 'cancelled';
      addBooking(businessDate, startHour, status);
    }

    // Upcoming requests so the admin "Pending requests" panel and customer grids have content.
    const upcoming: [number, number, BookingStatus][] = [
      [0, 21, 'pending'],
      [0, 22, 'approved'],
      [0, 23, 'pending'],
      [1, 19, 'pending'],
      [1, 20, 'approved'],
      [2, 21, 'pending'],
    ];
    for (const [dayOffset, startHour, status] of upcoming) {
      const businessDate = addDays(today, dayOffset);
      if (!isSlotPast(slotStart(businessDate, startHour, hours), now)) {
        addBooking(businessDate, startHour, status);
      }
    }

    await bookings.insertMany(docs);

    console.log(
      `Units: ${createdUnits.length} (${Object.keys(SEED_BUSY_MINUTES).join(', ')} busy)`,
    );
    console.log(`Food items: ${SEED_FOOD.length} in 4 categories`);
    console.log(`Bookings: ${docs.length}`);
    console.log(`Admin: ${email} (password from SEED_ADMIN_PASSWORD)`);
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
