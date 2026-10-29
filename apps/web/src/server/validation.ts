import "server-only";

import {
  BOOKING_SORT_FIELDS,
  BOOKING_STATUSES,
  CUSTOMER_NAME_MAX,
  CUSTOMER_NAME_MIN,
  INDIAN_PHONE_PATTERN,
  isValidIsoDate,
  normalizePhone,
  REASON_MAX,
  UNIT_STATUSES,
  UNIT_TYPES,
} from "@district-viii/shared";
import { z } from "zod";

/**
 * Request schemas. Objects are strict (unknown fields are rejected), free text
 * is sanitized, and phones are normalized to 10 digits before validation.
 */

const HTML_TAG = /<[^>]*>/g;
// Control characters and stray angle brackets never belong in names, reasons or descriptions.
const UNSAFE_TEXT = /[\u0000-\u001f\u007f<>]/g;

export function sanitizeText(value: string): string {
  return value.replace(HTML_TAG, "").replace(UNSAFE_TEXT, "").replace(/\s+/g, " ").trim();
}

const text = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(
      z
        .string()
        .min(min, { error: `${label} must be at least ${min} characters` })
        .max(max, { error: `${label} must be at most ${max} characters` }),
    );

const phone = z
  .string()
  .refine((value) => INDIAN_PHONE_PATTERN.test(value.trim()), {
    error: "phone must be a 10-digit Indian mobile number, optionally prefixed with +91",
  })
  .transform((value) => normalizePhone(value) ?? value);

const isoDate = z.string().refine(isValidIsoDate, { error: "must be a YYYY-MM-DD date" });
const objectIdString = z.string().regex(/^[a-f\d]{24}$/i, { error: "must be a valid id" });
const hour = z.number().int().min(0).max(23);
const queryInt = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

// ---------- Bookings ----------

export const createBookingSchema = z.strictObject({
  unitId: objectIdString,
  businessDate: isoDate,
  startHour: hour,
  customerName: text(CUSTOMER_NAME_MIN, CUSTOMER_NAME_MAX, "customerName"),
  customerPhone: phone,
});

export const cancelBookingSchema = z.strictObject({ phone: phone.optional() });

export const rejectBookingSchema = z.strictObject({
  reason: z.string().transform(sanitizeText).pipe(z.string().max(REASON_MAX)).optional(),
});

export const listBookingsQuerySchema = z.strictObject({
  status: z.enum(BOOKING_STATUSES).optional(),
  type: z.enum(UNIT_TYPES).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  search: z.string().transform(sanitizeText).pipe(z.string().max(60)).optional(),
  page: queryInt(1, 10_000).optional(),
  pageSize: queryInt(1, 100).optional(),
  sort: z.enum(BOOKING_SORT_FIELDS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

// ---------- Availability ----------

export const availabilityQuerySchema = z.strictObject({
  type: z.enum(UNIT_TYPES),
  date: isoDate,
});

// ---------- Units ----------

export const createUnitSchema = z.strictObject({
  name: text(1, 40, "name"),
  type: z.enum(UNIT_TYPES),
  isActive: z.boolean().optional(),
});

export const updateUnitSchema = z.strictObject({
  name: text(1, 40, "name").optional(),
  isActive: z.boolean().optional(),
});

export const updateUnitStatusSchema = z
  .strictObject({
    status: z.enum(UNIT_STATUSES),
    busyUntil: z.iso.datetime({ offset: true }).optional(),
  })
  .refine((value) => value.status !== "busy" || value.busyUntil !== undefined, {
    error: "busyUntil is required when status is busy",
    path: ["busyUntil"],
  });

// ---------- Blocked slots ----------

export const createBlockedSlotSchema = z.strictObject({
  unitId: objectIdString,
  businessDate: isoDate,
  startHour: hour,
  reason: text(2, REASON_MAX, "reason"),
});

export const updateBlockedSlotSchema = z.strictObject({ reason: text(2, REASON_MAX, "reason") });

export const listBlockedSlotsQuerySchema = z.strictObject({
  date: isoDate.optional(),
  unitId: objectIdString.optional(),
});

// ---------- Food ----------

const imageUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^(https?:\/\/[^\s<>"]+|\/[^\s<>"]*)?$/, { error: "imageUrl must be an http(s) URL or a path starting with /" });

const foodFields = {
  name: text(2, 60, "name"),
  category: text(2, 30, "category"),
  description: z.string().transform(sanitizeText).pipe(z.string().max(240)).optional(),
  imageUrl: imageUrl.optional(),
  price: z.number().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
};

export const createFoodSchema = z.strictObject(foodFields);
export const updateFoodSchema = z.strictObject(foodFields).partial();
export const foodQuerySchema = z.strictObject({
  category: z.string().transform(sanitizeText).pipe(z.string().max(30)).optional(),
});

// ---------- Settings ----------

export const updateSettingsSchema = z.strictObject({
  arenaName: text(2, 60, "arenaName").optional(),
  openHour: hour.optional(),
  closeHour: hour.optional(),
  slotDurationHours: z.number().int().min(1).max(4).optional(),
  bookingWindowDays: z.number().int().min(1).max(14).optional(),
  ps5PricePerHour: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
  poolPricePerHour: z.number().finite().min(0).max(100_000).multipleOf(0.01).nullable().optional(),
});

// ---------- Auth and dashboard ----------

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
});

export const daysQuerySchema = z.strictObject({ days: queryInt(1, 90).optional() });
export const emptyQuerySchema = z.strictObject({});

export const liveQuerySchema = z.strictObject({ since: z.iso.datetime({ offset: true }).optional() });
