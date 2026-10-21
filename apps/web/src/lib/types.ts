/** Shared API contracts. Keep these in sync with the NestJS DTOs in apps/api. */

export type UnitKind = "pool" | "ps5";

export interface UnitAvailability {
  total: number;
  free: number;
  /** ISO 8601 timestamp of the next unit to free up. Present when `free` is 0. */
  nextFreeAt?: string;
}

export type UnitsSummary = Record<UnitKind, UnitAvailability>;

export interface MyBookingStatus {
  hasPending: boolean;
}
