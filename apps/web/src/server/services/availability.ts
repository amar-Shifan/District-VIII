import "server-only";

import {
  addDays,
  type AvailabilityDto,
  businessDateOf,
  diffDays,
  type IsoDate,
  SLOT_HOLDING_STATUSES,
  slotHours,
  UNIT_TYPES,
  type UnitType,
  type UnitsSummaryDto,
} from "@district-viii/shared";
import type { Types } from "mongoose";
import { now } from "../clock";
import { badRequest } from "../http";
import { BlockedSlotModel, BookingModel, type UnitRecord } from "../models";
import { buildSlots, type SlotHold, SlotIndex, summarize, type UnitState } from "./availability-logic";
import { getSettings } from "./settings";
import { effectiveStatus, findActiveUnits, toUnitDto } from "./units";

/** How far back and ahead the grid may be queried. Booking rules are stricter. */
const VIEW_DAYS_BACK = 7;
const VIEW_DAYS_AHEAD = 60;

interface HoldRow {
  unitId: Types.ObjectId;
  businessDate: string;
  startHour: number;
  status: SlotHold["status"];
}

interface BlockRow {
  unitId: Types.ObjectId;
  businessDate: string;
  startHour: number;
}

function toUnitState(unit: UnitRecord, at: Date): UnitState {
  return { id: String(unit._id), status: effectiveStatus(unit, at), busyUntil: unit.busyUntil };
}

async function slotIndex(units: readonly UnitRecord[], dates: IsoDate[]): Promise<SlotIndex> {
  if (units.length === 0) return new SlotIndex([], []);
  const unitIds = units.map((unit) => unit._id);
  const [holds, blocks] = await Promise.all([
    BookingModel.find(
      { unitId: { $in: unitIds }, businessDate: { $in: dates }, status: { $in: SLOT_HOLDING_STATUSES } },
      { unitId: 1, businessDate: 1, startHour: 1, status: 1 },
    )
      .lean<HoldRow[]>()
      .exec(),
    BlockedSlotModel.find({ unitId: { $in: unitIds }, businessDate: { $in: dates } }, { unitId: 1, businessDate: 1, startHour: 1 })
      .lean<BlockRow[]>()
      .exec(),
  ]);
  return new SlotIndex(
    holds.map((hold) => ({ ...hold, unitId: String(hold.unitId) })),
    blocks.map((block) => ({ ...block, unitId: String(block.unitId) })),
  );
}

export async function getAvailability(type: UnitType, date: IsoDate): Promise<AvailabilityDto> {
  const at = now();
  const hours = await getSettings();
  const offset = diffDays(businessDateOf(at, hours), date);
  if (offset < -VIEW_DAYS_BACK || offset > VIEW_DAYS_AHEAD) throw badRequest("Date is outside the viewable range");

  const units = await findActiveUnits(type);
  const index = await slotIndex(units, [date]);
  return {
    type,
    date,
    hours: slotHours(hours),
    units: units.map((unit) => ({
      unit: toUnitDto(unit, at),
      slots: buildSlots({ unit: toUnitState(unit, at), businessDate: date, hours, index, now: at }),
    })),
    generatedAt: at.toISOString(),
  };
}

export async function getUnitsSummary(): Promise<UnitsSummaryDto> {
  const at = now();
  const hours = await getSettings();
  const today = businessDateOf(at, hours);
  const units = await findActiveUnits();
  // Today's and tomorrow's sessions cover every slot nextFreeAt can walk into.
  const index = await slotIndex(units, [today, addDays(today, 1)]);

  const entries = UNIT_TYPES.map((type) => {
    const ofType = units.filter((unit) => unit.type === type).map((unit) => toUnitState(unit, at));
    return [type, summarize(ofType, hours, index, at)] as const;
  });
  return Object.fromEntries(entries) as UnitsSummaryDto;
}
