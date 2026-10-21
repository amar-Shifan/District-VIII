import {
  addDays,
  BOOKING_STATUSES,
  type BookingStatus,
  type BookingsPerDayPoint,
  businessDateOf,
  currentSlot,
  type DashboardStatsDto,
  HOUR_MS,
  type PeakHourPoint,
  SLOT_HOLDING_STATUSES,
  slotHours,
  type StatusSplitPoint,
  UNIT_TYPES,
  type UnitType,
  type UsageByTypePoint,
} from '@district-viii/shared';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Booking } from '../bookings/booking.schema';
import { ClockService } from '../common/clock/clock.service';
import { SettingsService } from '../settings/settings.service';
import { effectiveStatus } from '../units/unit.mapper';
import { UnitsService } from '../units/units.service';

interface StatsFacet {
  today: { _id: BookingStatus; count: number }[];
  pending: { count: number }[];
  inUse: { _id: Types.ObjectId }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Booking.name) private readonly bookings: Model<Booking>,
    private readonly units: UnitsService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async stats(): Promise<DashboardStatsDto> {
    const now = this.clock.now();
    const settings = await this.settings.get();
    const today = businessDateOf(now, settings);
    const slot = currentSlot(now, settings);

    const [facet] = await this.bookings
      .aggregate<StatsFacet>([
        {
          $facet: {
            today: [
              { $match: { businessDate: today } },
              { $group: { _id: '$status', count: { $sum: 1 } } },
            ],
            // Pending requests whose slot hasn't finished yet still need a decision.
            pending: [
              {
                $match: {
                  status: 'pending',
                  startsAt: {
                    $gt: new Date(
                      now.getTime() - settings.slotDurationHours * HOUR_MS,
                    ),
                  },
                },
              },
              { $count: 'count' },
            ],
            inUse: slot
              ? [
                  {
                    $match: {
                      businessDate: slot.businessDate,
                      startHour: slot.startHour,
                      status: 'approved',
                    },
                  },
                  { $group: { _id: '$unitId' } },
                ]
              : [{ $limit: 0 }],
          },
        },
      ])
      .exec();

    const todayCount = (status: BookingStatus) =>
      facet?.today.find((row) => row._id === status)?.count ?? 0;
    const units = await this.units.findActive();
    const inUse = new Set((facet?.inUse ?? []).map((row) => String(row._id)));
    for (const unit of units) {
      if (effectiveStatus(unit, now) === 'busy') inUse.add(String(unit._id));
    }

    return {
      todayBookings: todayCount('pending') + todayCount('approved'),
      pendingCount: facet?.pending[0]?.count ?? 0,
      approvedToday: todayCount('approved'),
      unitsInUse: units.filter((unit) => inUse.has(String(unit._id))).length,
      totalUnits: units.length,
    };
  }

  async bookingsPerDay(days: number): Promise<BookingsPerDayPoint[]> {
    const { today, from } = await this.range(days);
    const rows = await this.bookings
      .aggregate<BookingsPerDayPoint>([
        { $match: { businessDate: { $gte: from, $lte: today } } },
        {
          $group: {
            _id: '$businessDate',
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] },
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
            },
          },
        },
        {
          $project: { _id: 0, date: '$_id', total: 1, approved: 1, pending: 1 },
        },
      ])
      .exec();
    const byDate = new Map(rows.map((row) => [row.date, row]));
    return Array.from({ length: days }, (_, index) => {
      const date = addDays(from, index);
      return byDate.get(date) ?? { date, total: 0, approved: 0, pending: 0 };
    });
  }

  /** Requested (pending or approved) bookings per start hour, in session order. */
  async peakHours(days: number): Promise<PeakHourPoint[]> {
    const { today, from } = await this.range(days);
    const rows = await this.aggregateCounts<number>([
      {
        $match: {
          businessDate: { $gte: from, $lte: today },
          status: { $in: [...SLOT_HOLDING_STATUSES] },
        },
      },
      { $group: { _id: '$startHour', count: { $sum: 1 } } },
    ]);
    const counts = new Map(rows.map((row) => [row._id, row.count]));
    const order = slotHours(await this.settings.get());
    // Keep hours that had bookings before the operating hours changed.
    for (const hour of counts.keys())
      if (!order.includes(hour)) order.push(hour);
    return order.map((hour) => ({ hour, count: counts.get(hour) ?? 0 }));
  }

  /** Booked hours per unit type, from approved bookings. */
  async usageByType(days: number): Promise<UsageByTypePoint[]> {
    const { today, from } = await this.range(days);
    const rows = await this.aggregateCounts<UnitType>([
      {
        $match: {
          businessDate: { $gte: from, $lte: today },
          status: 'approved',
        },
      },
      { $group: { _id: '$unitType', count: { $sum: '$durationHours' } } },
    ]);
    return UNIT_TYPES.map((type) => ({
      type,
      count: rows.find((row) => row._id === type)?.count ?? 0,
    }));
  }

  async statusSplit(days: number): Promise<StatusSplitPoint[]> {
    const { today, from } = await this.range(days);
    const rows = await this.aggregateCounts<BookingStatus>([
      { $match: { businessDate: { $gte: from, $lte: today } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return BOOKING_STATUSES.map((status) => ({
      status,
      count: rows.find((row) => row._id === status)?.count ?? 0,
    }));
  }

  private aggregateCounts<TKey>(
    pipeline: PipelineStage[],
  ): Promise<{ _id: TKey; count: number }[]> {
    return this.bookings
      .aggregate<{ _id: TKey; count: number }>(pipeline)
      .exec();
  }

  private async range(days: number): Promise<{ today: string; from: string }> {
    const today = businessDateOf(this.clock.now(), await this.settings.get());
    return { today, from: addDays(today, -(days - 1)) };
  }
}
