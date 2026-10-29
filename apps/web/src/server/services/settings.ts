import "server-only";

import {
  ARENA_TIME_ZONE,
  type PublicSettingsDto,
  type SettingsDto,
  slotHours,
  type UpdateSettingsInput,
} from "@district-viii/shared";
import { badRequest } from "../http";
import { bumpLive } from "../live";
import { DEFAULT_SETTINGS, type Settings, SettingsModel } from "../models";

/** Short per-instance cache; serverless instances don't share memory, so keep it brief. */
const CACHE_MS = 5_000;
let cache: { value: SettingsDto; at: number } | null = null;

function toDto(doc: Settings | null): SettingsDto {
  if (!doc) throw new Error("Settings document could not be loaded");
  return {
    arenaName: doc.arenaName,
    openHour: doc.openHour,
    closeHour: doc.closeHour,
    slotDurationHours: doc.slotDurationHours,
    bookingWindowDays: doc.bookingWindowDays,
    ps5PricePerHour: doc.ps5PricePerHour ?? null,
    poolPricePerHour: doc.poolPricePerHour ?? null,
  };
}

export async function getSettings(): Promise<SettingsDto> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const doc = await SettingsModel.findOneAndUpdate(
    { key: DEFAULT_SETTINGS.key },
    { $setOnInsert: { ...DEFAULT_SETTINGS } },
    { upsert: true, new: true, lean: true },
  ).exec();
  cache = { value: toDto(doc), at: Date.now() };
  return cache.value;
}

export async function getPublicSettings(): Promise<PublicSettingsDto> {
  const settings = await getSettings();
  return {
    arenaName: settings.arenaName,
    openHour: settings.openHour,
    closeHour: settings.closeHour,
    slotDurationHours: settings.slotDurationHours,
    bookingWindowDays: settings.bookingWindowDays,
    timeZone: ARENA_TIME_ZONE,
  };
}

export async function updateSettings(input: UpdateSettingsInput): Promise<SettingsDto> {
  const next = { ...(await getSettings()), ...input };
  if (slotHours(next).length === 0) {
    throw badRequest("Operating hours must fit at least one slot of the chosen duration");
  }
  const doc = await SettingsModel.findOneAndUpdate(
    { key: DEFAULT_SETTINGS.key },
    { $set: input },
    { upsert: true, new: true, lean: true },
  ).exec();
  cache = { value: toDto(doc), at: Date.now() };
  await bumpLive();
  return cache.value;
}

/** For tests and the seed script. */
export function clearSettingsCache(): void {
  cache = null;
}
