import type { IsoDate, OperatingHours } from "./dto";

/**
 * Business-day helpers. All arena logic runs in Asia/Kolkata, which has a
 * fixed UTC+05:30 offset and no daylight saving, so plain offset arithmetic
 * is exact and needs no time-zone database.
 */

export const ARENA_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 330 * 60_000;
export const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface IstParts {
  date: IsoDate;
  hour: number;
  minute: number;
}

function toIsoDate(utcMidnight: Date): IsoDate {
  return utcMidnight.toISOString().slice(0, 10);
}

function parseIsoDate(date: IsoDate): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** Wall-clock date and time in Asia/Kolkata for an instant. */
export function istParts(instant: Date | number): IstParts {
  const shifted = new Date(+instant + IST_OFFSET_MS);
  return {
    date: toIsoDate(shifted),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  return toIsoDate(new Date(parseIsoDate(value))) === value;
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return toIsoDate(new Date(parseIsoDate(date) + days * DAY_MS));
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((parseIsoDate(to) - parseIsoDate(from)) / DAY_MS);
}

/** True when the session runs past midnight (e.g. 12 PM to 4 AM). Equal hours mean open 24h. */
export function isOvernight(hours: OperatingHours): boolean {
  return hours.closeHour <= hours.openHour;
}

/** Start hours (clock hours, 0 to 23) of every bookable slot in one business session, in order. */
export function slotHours(hours: OperatingHours): number[] {
  const span = isOvernight(hours) ? 24 - hours.openHour + hours.closeHour : hours.closeHour - hours.openHour;
  const step = Math.max(1, Math.floor(hours.slotDurationHours));
  const result: number[] = [];
  for (let offset = 0; offset + step <= span; offset += step) {
    result.push((hours.openHour + offset) % 24);
  }
  return result;
}

export function isOperatingSlot(startHour: number, hours: OperatingHours): boolean {
  return slotHours(hours).includes(startHour);
}

/**
 * The business date an instant belongs to. Hours after midnight but before
 * closing (e.g. 1 AM) belong to the previous day's session.
 */
export function businessDateOf(instant: Date | number, hours: OperatingHours): IsoDate {
  const { date, hour } = istParts(instant);
  return isOvernight(hours) && hour < hours.closeHour ? addDays(date, -1) : date;
}

/** Real start instant of a slot. After-midnight slots fall on the next calendar day. */
export function slotStart(businessDate: IsoDate, startHour: number, hours: OperatingHours): Date {
  const dayOffset = isOvernight(hours) && startHour < hours.openHour ? 1 : 0;
  return new Date(parseIsoDate(businessDate) + dayOffset * DAY_MS + startHour * HOUR_MS - IST_OFFSET_MS);
}

export function slotEnd(businessDate: IsoDate, startHour: number, hours: OperatingHours): Date {
  return new Date(slotStart(businessDate, startHour, hours).getTime() + hours.slotDurationHours * HOUR_MS);
}

/** The slot running at `instant`, or null when the arena is closed. */
export function currentSlot(
  instant: Date | number,
  hours: OperatingHours,
): { businessDate: IsoDate; startHour: number } | null {
  const businessDate = businessDateOf(instant, hours);
  const time = +instant;
  for (const startHour of slotHours(hours)) {
    const start = slotStart(businessDate, startHour, hours).getTime();
    if (time >= start && time < start + hours.slotDurationHours * HOUR_MS) {
      return { businessDate, startHour };
    }
  }
  return null;
}

/** Business dates customers may book: today's session plus the following days in the window. */
export function bookableDates(instant: Date | number, hours: OperatingHours, windowDays: number): IsoDate[] {
  const today = businessDateOf(instant, hours);
  return Array.from({ length: Math.max(1, windowDays) }, (_, index) => addDays(today, index));
}

// ---------- Formatting ----------

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 20 -> "8 PM", 0 -> "12 AM". */
export function formatHour(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? "AM" : "PM";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display} ${suffix}`;
}

export function formatSlotRange(startHour: number, durationHours: number): string {
  return `${formatHour(startHour)} – ${formatHour(startHour + durationHours)}`;
}

/** "HH:MM" (24h) in Asia/Kolkata. */
export function formatIstClock(instant: Date | number | string): string {
  const time = typeof instant === "string" ? Date.parse(instant) : +instant;
  if (Number.isNaN(time)) return "--:--";
  const { hour, minute } = istParts(time);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "Thu 23 Oct". */
export function formatShortDate(date: IsoDate): string {
  const value = new Date(parseIsoDate(date));
  return `${WEEKDAYS[value.getUTCDay()]} ${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]}`;
}

/** "Today", "Tomorrow" or "Thu 23 Oct", relative to the current business date. */
export function formatBusinessDate(date: IsoDate, today: IsoDate): string {
  const offset = diffDays(today, date);
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  if (offset === -1) return "Yesterday";
  return formatShortDate(date);
}

/** A slot stays bookable this long after it starts, so someone walking in at 8:10 can still take the 8 PM slot. */
export const LATE_BOOKING_GRACE_MINUTES = 30;

/** True once a slot can no longer be booked. */
export function isSlotPast(startsAt: Date | number, instant: Date | number): boolean {
  return +instant >= +startsAt + LATE_BOOKING_GRACE_MINUTES * 60_000;
}
