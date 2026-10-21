import type { UnitDto, UnitStatus } from '@district-viii/shared';
import type { UnitRecord } from './unit.schema';

/** A "busy" unit whose busyUntil has passed is free, even before the cron job runs. */
export function effectiveStatus(
  unit: Pick<UnitRecord, 'status' | 'busyUntil'>,
  now: Date,
): UnitStatus {
  if (unit.status === 'busy' && (!unit.busyUntil || unit.busyUntil <= now))
    return 'free';
  return unit.status;
}

export function toUnitDto(unit: UnitRecord, now: Date): UnitDto {
  const status = effectiveStatus(unit, now);
  return {
    id: String(unit._id),
    name: unit.name,
    type: unit.type,
    status,
    busyUntil:
      status === 'busy' && unit.busyUntil ? unit.busyUntil.toISOString() : null,
    isActive: unit.isActive,
  };
}
