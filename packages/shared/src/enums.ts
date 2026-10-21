export const UNIT_TYPES = ["pool", "ps5"] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_STATUSES = ["free", "busy", "maintenance"] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const BOOKING_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Statuses that hold a slot. Only one booking per unit and slot may be in one of these. */
export const SLOT_HOLDING_STATUSES = ["pending", "approved"] as const satisfies readonly BookingStatus[];

export const BOOKING_SOURCES = ["online", "walk-in"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const SLOT_STATES = ["available", "pending", "booked", "busy", "maintenance", "past"] as const;
export type SlotState = (typeof SLOT_STATES)[number];

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  pool: "8 Ball Pool",
  ps5: "PS5 Stations",
};

export function isUnitType(value: unknown): value is UnitType {
  return typeof value === "string" && (UNIT_TYPES as readonly string[]).includes(value);
}
