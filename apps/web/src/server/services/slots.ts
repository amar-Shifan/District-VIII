import "server-only";

import {
  type BlockedSlotDto,
  type CreateBlockedSlotInput,
  type IsoDate,
  isOperatingSlot,
  SLOT_HOLDING_STATUSES,
} from "@district-viii/shared";
import type { FilterQuery } from "mongoose";
import { badRequest, conflict, isDuplicateKeyError, notFound } from "../http";
import { bumpLive } from "../live";
import { type BlockedSlot, BlockedSlotModel, type BlockedSlotRecord, BookingModel } from "../models";
import { getSettings } from "./settings";
import { getUnit, unitNames } from "./units";

function toDto(row: BlockedSlotRecord, names: Map<string, string>): BlockedSlotDto {
  return {
    id: String(row._id),
    unitId: String(row.unitId),
    unitName: names.get(String(row.unitId)) ?? "Removed unit",
    businessDate: row.businessDate,
    startHour: row.startHour,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listBlockedSlots(query: { date?: IsoDate; unitId?: string }): Promise<BlockedSlotDto[]> {
  const filter: FilterQuery<BlockedSlot> = {};
  if (query.date) filter.businessDate = query.date;
  if (query.unitId) filter.unitId = query.unitId;
  const [rows, names] = await Promise.all([
    BlockedSlotModel.find(filter).sort({ businessDate: 1, startHour: 1 }).limit(500).lean<BlockedSlotRecord[]>().exec(),
    unitNames(),
  ]);
  return rows.map((row) => toDto(row, names));
}

export async function blockSlot(input: CreateBlockedSlotInput): Promise<BlockedSlotDto> {
  const unit = await getUnit(input.unitId);
  const settings = await getSettings();
  if (!isOperatingSlot(input.startHour, settings)) throw badRequest("That time is outside operating hours");
  const held = await BookingModel.exists({
    unitId: unit._id,
    businessDate: input.businessDate,
    startHour: input.startHour,
    status: { $in: SLOT_HOLDING_STATUSES },
  }).exec();
  if (held) throw conflict("This slot already has a booking. Cancel or reject it first.");

  try {
    const created = await BlockedSlotModel.create({ ...input, unitId: unit._id });
    await bumpLive();
    return toDto(created.toObject<BlockedSlotRecord>(), new Map([[String(unit._id), unit.name]]));
  } catch (error) {
    if (isDuplicateKeyError(error)) throw conflict("This slot is already blocked");
    throw error;
  }
}

export async function updateBlockedSlot(id: string, reason: string): Promise<BlockedSlotDto> {
  const updated = await BlockedSlotModel.findByIdAndUpdate(id, { $set: { reason } }, { new: true })
    .lean<BlockedSlotRecord>()
    .exec();
  if (!updated) throw notFound("Blocked slot not found");
  return toDto(updated, await unitNames());
}

export async function unblockSlot(id: string): Promise<void> {
  const removed = await BlockedSlotModel.findByIdAndDelete(id).lean<BlockedSlotRecord>().exec();
  if (!removed) throw notFound("Blocked slot not found");
  await bumpLive();
}
