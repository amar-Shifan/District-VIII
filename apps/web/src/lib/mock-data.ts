import type { MyBookingStatus, UnitAvailability, UnitsSummary } from "./types";
import { VENUE } from "./venue";

/** Scenario rotation period, so the live-update feel is visible during development. */
const ROTATION_MS = 20_000;
const LATENCY_MS = 550;
const FIVE_MINUTES_MS = 5 * 60_000;

interface Scenario {
  pool: number;
  ps5: number;
  /** Minutes until the next unit frees up, used when that unit kind is full. */
  poolNextFreeIn?: number;
  ps5NextFreeIn?: number;
}

const SCENARIOS: readonly Scenario[] = [
  { pool: 2, ps5: 1 },
  { pool: 1, ps5: 0, ps5NextFreeIn: 25 },
  { pool: 3, ps5: 2 },
  { pool: 0, ps5: 1, poolNextFreeIn: 40 },
];

function currentScenario(now: number): Scenario {
  return SCENARIOS[Math.floor(now / ROTATION_MS) % SCENARIOS.length];
}

function nextFreeAt(now: number, minutes: number | undefined): string | undefined {
  if (minutes === undefined) return undefined;
  const rounded = Math.ceil((now + minutes * 60_000) / FIVE_MINUTES_MS) * FIVE_MINUTES_MS;
  return new Date(rounded).toISOString();
}

function unit(total: number, free: number, nextFreeInMinutes: number | undefined, now: number): UnitAvailability {
  return free > 0 ? { total, free } : { total, free, nextFreeAt: nextFreeAt(now, nextFreeInMinutes) };
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS));
}

export const mockApi = {
  getUnitsSummary(): Promise<UnitsSummary> {
    const now = Date.now();
    const scenario = currentScenario(now);
    return delay({
      pool: unit(VENUE.units.pool, scenario.pool, scenario.poolNextFreeIn, now),
      ps5: unit(VENUE.units.ps5, scenario.ps5, scenario.ps5NextFreeIn, now),
    });
  },

  getMyBookingStatus(): Promise<MyBookingStatus> {
    return delay({ hasPending: true });
  },
};
