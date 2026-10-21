import "server-only";

import {
  type CreateUnitInput,
  HOUR_MS,
  SLOT_HOLDING_STATUSES,
  type UnitDto,
  type UnitStatus,
  type UnitType,
  type UpdateUnitInput,
  type UpdateUnitStatusInput,
} from "@district-viii/shared";
import { now } from "../clock";
import { badRequest, conflict, isDuplicateKeyError, notFound } from "../http";
import { bumpLive } from "../live";
import { BlockedSlotModel, BookingModel, UnitModel, type UnitRecord } from "../models";

const MAX_BUSY_HOURS = 24;
/** Natural sort, so "Table 10" comes after "Table 2". */
const NAME_COLLATION = { locale: "en", numericOrdering: true };
/** How often (per instance) expired busy units are written back to "free". */
const RELEASE_INTERVAL_MS = 20_000;

/** A "busy" unit whose busyUntil has passed is free, even before it is written back. */
export function effectiveStatus(unit: Pick<UnitRecord, "status" | "busyUntil">, at: Date): UnitStatus {
  if (unit.status === "busy" && (!unit.busyUntil || unit.busyUntil <= at)) return "free";
  return unit.status;
}

export function toUnitDto(unit: UnitRecord, at: Date): UnitDto {
  const status = effectiveStatus(unit, at);
  return {
    id: String(unit._id),
    name: unit.name,
    type: unit.type,
    status,
    busyUntil: status === "busy" && unit.busyUntil ? unit.busyUntil.toISOString() : null,
    isActive: unit.isActive,
  };
}

let lastRelease = 0;

/**
 * Sets units back to free once busyUntil has passed. Replaces the old
 * every-minute cron: Vercel functions don't run in the background, so this
 * runs (throttled) whenever units or availability are read. Reads already
 * treat expired units as free via effectiveStatus, so nothing waits on it.
 */
export async function releaseExpiredUnits(force = false): Promise<number> {
  const time = Date.now();
  if (!force && time - lastRelease < RELEASE_INTERVAL_MS) return 0;
  lastRelease = time;
  const result = await UnitModel.updateMany(
    { status: "busy", busyUntil: { $lte: now() } },
    { $set: { status: "free", busyUntil: null } },
  ).exec();
  if (result.modifiedCount > 0) await bumpLive();
  return result.modifiedCount;
}

export async function findActiveUnits(type?: UnitType): Promise<UnitRecord[]> {
  await releaseExpiredUnits();
  return UnitModel.find({ isActive: true, ...(type ? { type } : {}) })
    .sort({ type: 1, name: 1 })
    .collation(NAME_COLLATION)
    .lean<UnitRecord[]>()
    .exec();
}

export async function listPublicUnits(): Promise<UnitDto[]> {
  const at = now();
  return (await findActiveUnits()).map((unit) => toUnitDto(unit, at));
}

export async function listAllUnits(): Promise<UnitDto[]> {
  await releaseExpiredUnits();
  const at = now();
  const units = await UnitModel.find().sort({ type: 1, name: 1 }).collation(NAME_COLLATION).lean<UnitRecord[]>().exec();
  return units.map((unit) => toUnitDto(unit, at));
}

export async function getUnit(id: string): Promise<UnitRecord> {
  const unit = await UnitModel.findById(id).lean<UnitRecord>().exec();
  if (!unit) throw notFound("Unit not found");
  return unit;
}

export async function unitNames(): Promise<Map<string, string>> {
  const units = await UnitModel.find({}, { name: 1 }).lean<UnitRecord[]>().exec();
  return new Map(units.map((unit) => [String(unit._id), unit.name]));
}

async function publish(unit: UnitRecord): Promise<UnitDto> {
  await bumpLive();
  return toUnitDto(unit, now());
}

export async function createUnit(input: CreateUnitInput): Promise<UnitDto> {
  try {
    const created = await UnitModel.create({ ...input, status: "free", busyUntil: null });
    return publish(created.toObject<UnitRecord>());
  } catch (error) {
    if (isDuplicateKeyError(error)) throw conflict(`A ${input.type} unit named "${input.name}" already exists`);
    throw error;
  }
}

export async function updateUnit(id: string, input: UpdateUnitInput): Promise<UnitDto> {
  try {
    const updated = await UnitModel.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true })
      .lean<UnitRecord>()
      .exec();
    if (!updated) throw notFound("Unit not found");
    return publish(updated);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw conflict("Another unit of this type already has that name");
    throw error;
  }
}

export async function updateUnitStatus(id: string, input: UpdateUnitStatusInput): Promise<UnitDto> {
  const at = now();
  let busyUntil: Date | null = null;
  if (input.status === "busy") {
    busyUntil = new Date(input.busyUntil ?? "");
    if (Number.isNaN(busyUntil.getTime()) || busyUntil <= at) throw badRequest("busyUntil must be in the future");
    if (busyUntil.getTime() - at.getTime() > MAX_BUSY_HOURS * HOUR_MS) {
      throw badRequest(`busyUntil must be within ${MAX_BUSY_HOURS} hours`);
    }
  }
  const updated = await UnitModel.findByIdAndUpdate(id, { $set: { status: input.status, busyUntil } }, { new: true })
    .lean<UnitRecord>()
    .exec();
  if (!updated) throw notFound("Unit not found");
  return publish(updated);
}

export async function deleteUnit(id: string): Promise<void> {
  const unit = await getUnit(id);
  const upcoming = await BookingModel.countDocuments({
    unitId: unit._id,
    status: { $in: SLOT_HOLDING_STATUSES },
    startsAt: { $gte: now() },
  }).exec();
  if (upcoming > 0) {
    throw conflict(`This unit has ${upcoming} upcoming booking(s). Cancel them or deactivate the unit instead.`);
  }
  await BlockedSlotModel.deleteMany({ unitId: unit._id }).exec();
  await UnitModel.deleteOne({ _id: unit._id }).exec();
  await bumpLive();
}
