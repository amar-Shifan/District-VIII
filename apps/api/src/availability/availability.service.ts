import {
  type AvailabilityDto,
  addDays,
  businessDateOf,
  diffDays,
  type IsoDate,
  SLOT_HOLDING_STATUSES,
  slotHours,
  UNIT_TYPES,
  type UnitType,
  type UnitsSummaryDto,
} from '@district-viii/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClockService } from '../common/clock/clock.service';
import { Booking } from '../bookings/booking.schema';
import { SettingsService } from '../settings/settings.service';
import { BlockedSlot } from '../slots/blocked-slot.schema';
import { effectiveStatus, toUnitDto } from '../units/unit.mapper';
import type { UnitRecord } from '../units/unit.schema';
import { UnitsService } from '../units/units.service';
import {
  buildSlots,
  SlotIndex,
  type SlotHold,
  summarize,
  type UnitState,
} from './availability.logic';

/** How far back and ahead the public grid may be queried. Booking rules are stricter. */
const VIEW_DAYS_BACK = 7;
const VIEW_DAYS_AHEAD = 60;

interface HoldRow {
  unitId: Types.ObjectId;
  businessDate: string;
  startHour: number;
  status: SlotHold['status'];
}

interface BlockRow {
  unitId: Types.ObjectId;
  businessDate: string;
  startHour: number;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Booking.name) private readonly bookings: Model<Booking>,
    @InjectModel(BlockedSlot.name)
    private readonly blockedSlots: Model<BlockedSlot>,
    private readonly units: UnitsService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async availability(type: UnitType, date: IsoDate): Promise<AvailabilityDto> {
    const now = this.clock.now();
    const hours = await this.settings.get();
    const offset = diffDays(businessDateOf(now, hours), date);
    if (offset < -VIEW_DAYS_BACK || offset > VIEW_DAYS_AHEAD) {
      throw new BadRequestException('Date is outside the viewable range');
    }

    const units = await this.units.findActive(type);
    const index = await this.slotIndex(units, [date]);

    return {
      type,
      date,
      hours: slotHours(hours),
      units: units.map((unit) => ({
        unit: toUnitDto(unit, now),
        slots: buildSlots({
          unit: toUnitState(unit, now),
          businessDate: date,
          hours,
          index,
          now,
        }),
      })),
      generatedAt: now.toISOString(),
    };
  }

  async summary(): Promise<UnitsSummaryDto> {
    const now = this.clock.now();
    const hours = await this.settings.get();
    const today = businessDateOf(now, hours);
    const units = await this.units.findActive();
    // Today's and tomorrow's sessions cover every slot nextFreeAt can walk into.
    const index = await this.slotIndex(units, [today, addDays(today, 1)]);

    const entries = UNIT_TYPES.map((type) => {
      const ofType = units
        .filter((unit) => unit.type === type)
        .map((unit) => toUnitState(unit, now));
      return [type, summarize(ofType, hours, index, now)] as const;
    });
    return Object.fromEntries(entries) as UnitsSummaryDto;
  }

  private async slotIndex(
    units: readonly UnitRecord[],
    dates: IsoDate[],
  ): Promise<SlotIndex> {
    if (units.length === 0) return new SlotIndex([], []);
    const unitIds = units.map((unit) => unit._id);
    const [holds, blocks] = await Promise.all([
      this.bookings
        .find(
          {
            unitId: { $in: unitIds },
            businessDate: { $in: dates },
            status: { $in: SLOT_HOLDING_STATUSES },
          },
          { unitId: 1, businessDate: 1, startHour: 1, status: 1 },
        )
        .lean<HoldRow[]>()
        .exec(),
      this.blockedSlots
        .find(
          { unitId: { $in: unitIds }, businessDate: { $in: dates } },
          { unitId: 1, businessDate: 1, startHour: 1 },
        )
        .lean<BlockRow[]>()
        .exec(),
    ]);
    return new SlotIndex(
      holds.map((hold) => ({ ...hold, unitId: String(hold.unitId) })),
      blocks.map((block) => ({ ...block, unitId: String(block.unitId) })),
    );
  }
}

function toUnitState(unit: UnitRecord, now: Date): UnitState {
  return {
    id: String(unit._id),
    status: effectiveStatus(unit, now),
    busyUntil: unit.busyUntil,
  };
}
