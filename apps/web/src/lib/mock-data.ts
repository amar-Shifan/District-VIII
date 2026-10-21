import {
  ARENA_TIME_ZONE,
  type AvailabilityDto,
  type BookingDto,
  businessDateOf,
  type CreateBookingInput,
  currentSlot,
  diffDays,
  type FoodCategoryDto,
  HOUR_MS,
  type IsoDate,
  isOperatingSlot,
  isSlotPast,
  normalizePhone,
  type PublicFoodItemDto,
  type PublicSettingsDto,
  type SlotState,
  slotHours,
  slotStart,
  type UnitAvailabilitySummary,
  type UnitDto,
  type UnitType,
  type UnitsSummaryDto,
} from "@district-viii/shared";
import { ApiError } from "./api-error";

/**
 * In-browser stand-in for the NestJS API (NEXT_PUBLIC_USE_MOCK=true). Keeps
 * bookings in memory and rotates which units are busy every 20 seconds, so
 * live updates are visible without a backend.
 */

const ROTATION_MS = 20_000;
const LATENCY_MS = 450;

const SETTINGS: PublicSettingsDto = {
  arenaName: "District VIII",
  openHour: 12,
  closeHour: 4,
  slotDurationHours: 1,
  bookingWindowDays: 3,
  timeZone: ARENA_TIME_ZONE,
};

const UNITS: { id: string; name: string; type: UnitType }[] = [
  { id: "mock-table-1", name: "Table 1", type: "pool" },
  { id: "mock-table-2", name: "Table 2", type: "pool" },
  { id: "mock-table-3", name: "Table 3", type: "pool" },
  { id: "mock-ps5-1", name: "PS5 #1", type: "ps5" },
  { id: "mock-ps5-2", name: "PS5 #2", type: "ps5" },
];

/** Busy minutes per unit for each 20-second scenario. */
const SCENARIOS: Record<string, number>[] = [
  { "mock-table-2": 40 },
  { "mock-table-2": 25, "mock-ps5-1": 35, "mock-ps5-2": 15 },
  {},
  { "mock-table-1": 50, "mock-table-2": 20, "mock-table-3": 45, "mock-ps5-2": 30 },
];

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?w=480&q=70&auto=format&fit=crop`;
const FOOD: PublicFoodItemDto[] = [
  ["Burgers", "District Smash Burger", "Double smashed patty, cheddar and house sauce.", "1568901346375-23c9450c58cd"],
  ["Burgers", "Crispy Chicken Burger", "Buttermilk fried chicken, slaw and jalapeños.", "1550547660-d9450f859349"],
  ["Snacks", "Loaded Fries", "Seasoned fries with cheese sauce.", "1573080496219-bb080dd4f877"],
  ["Snacks", "Peri Peri Wings", "Six wings with garlic dip.", "1608039755401-742074f0548d"],
  ["Drinks", "Oreo Thick Shake", "Vanilla ice cream and crushed Oreo.", "1572490122747-3968b75cc699"],
  ["Drinks", "Lime Mint Cooler", "Fresh lime, mint and soda.", "1513558161293-cdaf765ed2fd"],
  ["Meals", "Chicken Biryani", "Malabar-style dum biryani with raita.", "1563379091339-03b21ab4a4f8"],
  ["Meals", "Egg Fried Rice", "Wok-tossed rice with egg and vegetables.", "1603133872878-684f208fb84b"],
].map(([category, name, description, image], index) => ({
  id: `mock-food-${index}`,
  category: category ?? "",
  name: name ?? "",
  description: description ?? "",
  imageUrl: unsplash(image ?? ""),
  sortOrder: index * 10,
}));

const bookings: BookingDto[] = [];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

function liveUnits(now: Date): UnitDto[] {
  const scenario = SCENARIOS[Math.floor(now.getTime() / ROTATION_MS) % SCENARIOS.length] ?? {};
  return UNITS.map((unit) => {
    const minutes = scenario[unit.id];
    return {
      ...unit,
      status: minutes ? "busy" : "free",
      busyUntil: minutes ? new Date(now.getTime() + minutes * 60_000).toISOString() : null,
      isActive: true,
    };
  });
}

function holdFor(unitId: string, businessDate: IsoDate, startHour: number): BookingDto | undefined {
  return bookings.find(
    (booking) =>
      booking.unitId === unitId &&
      booking.businessDate === businessDate &&
      booking.startHour === startHour &&
      (booking.status === "pending" || booking.status === "approved"),
  );
}

function slotStateFor(unit: UnitDto, businessDate: IsoDate, startHour: number, now: Date): SlotState {
  const start = slotStart(businessDate, startHour, SETTINGS);
  if (isSlotPast(start, now)) return "past";
  const hold = holdFor(unit.id, businessDate, startHour);
  if (hold) return hold.status === "approved" ? "booked" : "pending";
  if (unit.busyUntil && Date.parse(unit.busyUntil) > start.getTime()) return "busy";
  return "available";
}

function summarize(units: UnitDto[], now: Date): UnitAvailabilitySummary {
  const slot = currentSlot(now, SETTINGS);
  const isFree = (unit: UnitDto) =>
    unit.status === "free" && !(slot && holdFor(unit.id, slot.businessDate, slot.startHour));
  const free = units.filter(isFree).length;
  if (free > 0) return { total: units.length, free };
  const soonest = Math.min(...units.map((unit) => (unit.busyUntil ? Date.parse(unit.busyUntil) : now.getTime() + HOUR_MS)));
  return { total: units.length, free, nextFreeAt: new Date(soonest).toISOString() };
}

export const mockApi = {
  getUnitsSummary(): Promise<UnitsSummaryDto> {
    const now = new Date();
    const units = liveUnits(now);
    return delay({
      pool: summarize(units.filter((unit) => unit.type === "pool"), now),
      ps5: summarize(units.filter((unit) => unit.type === "ps5"), now),
    });
  },

  getAvailability(type: UnitType, date: IsoDate): Promise<AvailabilityDto> {
    const now = new Date();
    const hours = slotHours(SETTINGS);
    return delay({
      type,
      date,
      hours,
      generatedAt: now.toISOString(),
      units: liveUnits(now)
        .filter((unit) => unit.type === type)
        .map((unit) => ({
          unit,
          slots: hours.map((startHour) => {
            const startsAt = slotStart(date, startHour, SETTINGS);
            return {
              startHour,
              startsAt: startsAt.toISOString(),
              endsAt: new Date(startsAt.getTime() + HOUR_MS).toISOString(),
              state: slotStateFor(unit, date, startHour, now),
            };
          }),
        })),
    });
  },

  async createBooking(input: CreateBookingInput): Promise<BookingDto> {
    const now = new Date();
    const unit = liveUnits(now).find((item) => item.id === input.unitId);
    const phone = normalizePhone(input.customerPhone);
    const offset = diffDays(businessDateOf(now, SETTINGS), input.businessDate);
    await delay(null);
    if (!unit || !phone || !isOperatingSlot(input.startHour, SETTINGS) || offset < 0 || offset >= SETTINGS.bookingWindowDays) {
      throw new ApiError(400, "That slot can't be booked");
    }
    if (slotStateFor(unit, input.businessDate, input.startHour, now) !== "available") {
      throw new ApiError(409, "Sorry, someone just requested this slot. Please pick another time.");
    }
    const startsAt = slotStart(input.businessDate, input.startHour, SETTINGS);
    const booking: BookingDto = {
      id: `mock-booking-${bookings.length + 1}`,
      unitId: unit.id,
      unitName: unit.name,
      unitType: unit.type,
      businessDate: input.businessDate,
      startHour: input.startHour,
      durationHours: 1,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + HOUR_MS).toISOString(),
      customerName: input.customerName.trim(),
      customerPhone: phone,
      status: "pending",
      source: "online",
      rejectionReason: null,
      approvedAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    bookings.unshift(booking);
    return booking;
  },

  getBookingsByPhone(phone: string): Promise<BookingDto[]> {
    const normalized = normalizePhone(phone);
    return delay(bookings.filter((booking) => booking.customerPhone === normalized));
  },

  async cancelBooking(id: string, phone: string): Promise<BookingDto> {
    await delay(null);
    const booking = bookings.find((item) => item.id === id);
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.customerPhone !== normalizePhone(phone)) {
      throw new ApiError(403, "This booking belongs to a different phone number");
    }
    if (booking.status !== "pending") throw new ApiError(409, `This booking is already ${booking.status}`);
    booking.status = "cancelled";
    booking.updatedAt = new Date().toISOString();
    return booking;
  },

  getFood(): Promise<PublicFoodItemDto[]> {
    return delay(FOOD);
  },

  getFoodCategories(): Promise<FoodCategoryDto[]> {
    const counts = new Map<string, number>();
    for (const item of FOOD) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return delay([...counts].map(([name, count]) => ({ name, count })));
  },

  getPublicSettings(): Promise<PublicSettingsDto> {
    return delay(SETTINGS);
  },
};
