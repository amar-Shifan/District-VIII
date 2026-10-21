import {
  currentSlot,
  HOUR_MS,
  type IsoDate,
  isSlotPast,
  type OperatingHours,
  type SlotDto,
  type SlotState,
  slotHours,
  slotStart,
  type UnitAvailabilitySummary,
  type UnitStatus,
} from "@district-viii/shared";

/**
 * Pure availability rules, free of the database so they can be unit tested
 * exhaustively. The availability service gathers data and calls these.
 */

export interface UnitState {
  id: string;
  /** Effective status (a "busy" unit past its busyUntil is already "free"). */
  status: UnitStatus;
  busyUntil: Date | null;
}

export interface SlotHold {
  unitId: string;
  businessDate: IsoDate;
  startHour: number;
  status: "pending" | "approved";
}

export interface SlotBlock {
  unitId: string;
  businessDate: IsoDate;
  startHour: number;
}

export function slotKey(unitId: string, businessDate: IsoDate, startHour: number): string {
  return `${unitId}|${businessDate}|${startHour}`;
}

/** Index holds and blocks by slot key for O(1) lookups. */
export class SlotIndex {
  private readonly holds = new Map<string, SlotHold["status"]>();
  private readonly blocks = new Set<string>();

  constructor(holds: readonly SlotHold[], blocks: readonly SlotBlock[]) {
    for (const hold of holds) {
      const key = slotKey(hold.unitId, hold.businessDate, hold.startHour);
      // Approved wins if both somehow exist.
      if (this.holds.get(key) !== "approved") this.holds.set(key, hold.status);
    }
    for (const block of blocks) this.blocks.add(slotKey(block.unitId, block.businessDate, block.startHour));
  }

  hold(unitId: string, businessDate: IsoDate, startHour: number): SlotHold["status"] | undefined {
    return this.holds.get(slotKey(unitId, businessDate, startHour));
  }

  isBlocked(unitId: string, businessDate: IsoDate, startHour: number): boolean {
    return this.blocks.has(slotKey(unitId, businessDate, startHour));
  }
}

/**
 * State of one slot, by precedence: past, maintenance, booked, pending,
 * busy (blocked by an admin, or the unit is busy into the slot), available.
 */
export function slotState(params: {
  unit: UnitState;
  businessDate: IsoDate;
  startHour: number;
  hours: OperatingHours;
  index: SlotIndex;
  now: Date;
}): SlotState {
  const { unit, businessDate, startHour, hours, index, now } = params;
  const start = slotStart(businessDate, startHour, hours);

  if (isSlotPast(start, now)) return "past";
  if (unit.status === "maintenance") return "maintenance";

  const hold = index.hold(unit.id, businessDate, startHour);
  if (hold === "approved") return "booked";
  if (hold === "pending") return "pending";

  if (index.isBlocked(unit.id, businessDate, startHour)) return "busy";
  if (unit.status === "busy" && unit.busyUntil && unit.busyUntil > start) return "busy";
  return "available";
}

export function buildSlots(params: {
  unit: UnitState;
  businessDate: IsoDate;
  hours: OperatingHours;
  index: SlotIndex;
  now: Date;
}): SlotDto[] {
  const { businessDate, hours } = params;
  return slotHours(hours).map((startHour) => {
    const startsAt = slotStart(businessDate, startHour, hours);
    return {
      startHour,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + hours.slotDurationHours * HOUR_MS).toISOString(),
      state: slotState({ ...params, startHour }),
    };
  });
}

/** Free right now: not in maintenance, not busy, and the current slot is neither held nor blocked. */
export function isUnitFreeNow(unit: UnitState, hours: OperatingHours, index: SlotIndex, now: Date): boolean {
  if (unit.status !== "free") return false;
  const slot = currentSlot(now, hours);
  if (!slot) return true;
  return (
    index.hold(unit.id, slot.businessDate, slot.startHour) === undefined &&
    !index.isBlocked(unit.id, slot.businessDate, slot.startHour)
  );
}

const MAX_LOOKAHEAD_SLOTS = 48;

/**
 * When a unit next becomes free: after its busy time, then past any run of
 * consecutive held or blocked slots. Null for units in maintenance.
 */
export function nextFreeAt(unit: UnitState, hours: OperatingHours, index: SlotIndex, now: Date): Date | null {
  if (unit.status === "maintenance") return null;
  let cursor = now;
  if (unit.status === "busy" && unit.busyUntil && unit.busyUntil > cursor) cursor = unit.busyUntil;

  for (let step = 0; step < MAX_LOOKAHEAD_SLOTS; step += 1) {
    const slot = currentSlot(cursor, hours);
    if (!slot) return cursor;
    const taken =
      index.hold(unit.id, slot.businessDate, slot.startHour) !== undefined ||
      index.isBlocked(unit.id, slot.businessDate, slot.startHour);
    if (!taken) return cursor;
    cursor = new Date(slotStart(slot.businessDate, slot.startHour, hours).getTime() + hours.slotDurationHours * HOUR_MS);
  }
  return cursor;
}

export function summarize(
  units: readonly UnitState[],
  hours: OperatingHours,
  index: SlotIndex,
  now: Date,
): UnitAvailabilitySummary {
  const free = units.filter((unit) => isUnitFreeNow(unit, hours, index, now)).length;
  if (free > 0 || units.length === 0) return { total: units.length, free };

  const candidates = units
    .map((unit) => nextFreeAt(unit, hours, index, now))
    .filter((value): value is Date => value !== null);
  if (candidates.length === 0) return { total: units.length, free };
  const earliest = new Date(Math.min(...candidates.map((value) => value.getTime())));
  return { total: units.length, free, nextFreeAt: earliest.toISOString() };
}
