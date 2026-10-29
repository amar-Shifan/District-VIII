import "server-only";

import {
  addDays,
  BOOKING_STATUSES,
  type BookingStatus,
  type BookingsPerDayPoint,
  businessDateOf,
  currentSlot,
  type DashboardStatsDto,
  type DailyEstimatedSalesDto,
  HOUR_MS,
  type IsoDate,
  ARENA_TIME_ZONE,
  type PeakHourPoint,
  SLOT_HOLDING_STATUSES,
  slotHours,
  type StatusSplitPoint,
  UNIT_TYPES,
  type UnitType,
  type UsageByTypePoint,
} from "@district-viii/shared";
import type { PipelineStage, Types } from "mongoose";
import { now } from "../clock";
import { BookingModel } from "../models";
import { getSettings } from "./settings";
import { effectiveStatus, findActiveUnits } from "./units";

interface StatsFacet {
  today: { _id: BookingStatus; count: number; estimatedBookingValue: number; unpricedApproved: number }[];
  pending: { count: number }[];
  inUse: { _id: Types.ObjectId }[];
}

async function range(days: number): Promise<{ today: string; from: string }> {
  const today = businessDateOf(now(), await getSettings());
  return { today, from: addDays(today, -(days - 1)) };
}

function arenaCalendarDate(instant: Date): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARENA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}` as IsoDate;
}

function arenaMidnight(date: IsoDate): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

/** Approved saved estimates by calendar date in the arena timezone; no disposable summary collection is needed. */
export async function estimatedSalesLastSevenDays(): Promise<DailyEstimatedSalesDto[]> {
  const today = arenaCalendarDate(now());
  const from = addDays(today, -6);
  const throughTomorrow = addDays(today, 1);
  const rows = await BookingModel.aggregate<{
    _id: IsoDate;
    bookingCount: number;
    estimatedBookingValue: number;
    missingEstimateCount: number;
  }>([
    {
      $match: {
        status: "approved",
        startsAt: { $gte: arenaMidnight(from), $lt: arenaMidnight(throughTomorrow) },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$startsAt", timezone: ARENA_TIME_ZONE } },
        bookingCount: { $sum: 1 },
        estimatedBookingValue: { $sum: { $ifNull: ["$estimatedAmount", 0] } },
        missingEstimateCount: {
          $sum: { $cond: [{ $eq: [{ $ifNull: ["$estimatedAmount", null] }, null] }, 1, 0] },
        },
      },
    },
  ]).exec();
  const byDate = new Map(rows.map((row) => [row._id, row]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(from, index);
    const row = byDate.get(date);
    return {
      date,
      estimatedBookingValue: !row ? 0 : row.missingEstimateCount > 0 ? null : row.estimatedBookingValue,
      bookingCount: row?.bookingCount ?? 0,
      missingEstimateCount: row?.missingEstimateCount ?? 0,
    };
  });
}

function countBy<TKey>(pipeline: PipelineStage[]): Promise<{ _id: TKey; count: number }[]> {
  return BookingModel.aggregate<{ _id: TKey; count: number }>(pipeline).exec();
}

export async function dashboardStats(): Promise<DashboardStatsDto> {
  const at = now();
  const settings = await getSettings();
  const today = businessDateOf(at, settings);
  const slot = currentSlot(at, settings);

  const [facet] = await BookingModel.aggregate<StatsFacet>([
    {
      $facet: {
        today: [
          { $match: { businessDate: today } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              estimatedBookingValue: {
                $sum: {
                  $cond: [{ $eq: ["$status", "approved"] }, { $ifNull: ["$estimatedAmount", 0] }, 0],
                },
              },
              unpricedApproved: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ["$status", "approved"] }, { $eq: [{ $ifNull: ["$estimatedAmount", null] }, null] }] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        // Pending requests whose slot hasn't finished yet still need a decision.
        pending: [
          {
            $match: {
              status: "pending",
              startsAt: { $gt: new Date(at.getTime() - settings.slotDurationHours * HOUR_MS) },
            },
          },
          { $count: "count" },
        ],
        inUse: slot
          ? [
              { $match: { businessDate: slot.businessDate, startHour: slot.startHour, status: "approved" } },
              { $group: { _id: "$unitId" } },
            ]
          : [{ $match: { _id: null } }], // closed: no slot is running, so nothing is in use
      },
    },
  ]).exec();

  const todayCount = (status: BookingStatus) => facet?.today.find((row) => row._id === status)?.count ?? 0;
  const units = await findActiveUnits();
  const inUse = new Set((facet?.inUse ?? []).map((row) => String(row._id)));
  for (const unit of units) if (effectiveStatus(unit, at) === "busy") inUse.add(String(unit._id));

  return {
    todayBookings: todayCount("pending") + todayCount("approved"),
    pendingCount: facet?.pending[0]?.count ?? 0,
    approvedToday: todayCount("approved"),
    unpricedApprovedToday: facet?.today.find((row) => row._id === "approved")?.unpricedApproved ?? 0,
    unitsInUse: units.filter((unit) => inUse.has(String(unit._id))).length,
    totalUnits: units.length,
    estimatedBookingValueToday: (() => {
      const approved = facet?.today.find((row) => row._id === "approved");
      if (approved?.unpricedApproved) return null;
      return approved?.estimatedBookingValue ?? 0;
    })(),
  };
}

export async function bookingsPerDay(days: number): Promise<BookingsPerDayPoint[]> {
  const { today, from } = await range(days);
  const rows = await BookingModel.aggregate<BookingsPerDayPoint>([
    { $match: { businessDate: { $gte: from, $lte: today } } },
    {
      $group: {
        _id: "$businessDate",
        total: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, date: "$_id", total: 1, approved: 1, pending: 1 } },
  ]).exec();
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index);
    return byDate.get(date) ?? { date, total: 0, approved: 0, pending: 0 };
  });
}

/** Requested (pending or approved) bookings per start hour, in session order. */
export async function peakHours(days: number): Promise<PeakHourPoint[]> {
  const { today, from } = await range(days);
  const rows = await countBy<number>([
    { $match: { businessDate: { $gte: from, $lte: today }, status: { $in: [...SLOT_HOLDING_STATUSES] } } },
    { $group: { _id: "$startHour", count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id, row.count]));
  const order = slotHours(await getSettings());
  // Keep hours that had bookings before the operating hours changed.
  for (const hour of counts.keys()) if (!order.includes(hour)) order.push(hour);
  return order.map((hour) => ({ hour, count: counts.get(hour) ?? 0 }));
}

/** Booked hours per unit type, from approved bookings. */
export async function usageByType(days: number): Promise<UsageByTypePoint[]> {
  const { today, from } = await range(days);
  const rows = await countBy<UnitType>([
    { $match: { businessDate: { $gte: from, $lte: today }, status: "approved" } },
    { $group: { _id: "$unitType", count: { $sum: "$durationHours" } } },
  ]);
  return UNIT_TYPES.map((type) => ({ type, count: rows.find((row) => row._id === type)?.count ?? 0 }));
}

export async function statusSplit(days: number): Promise<StatusSplitPoint[]> {
  const { today, from } = await range(days);
  const rows = await countBy<BookingStatus>([
    { $match: { businessDate: { $gte: from, $lte: today } } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return BOOKING_STATUSES.map((status) => ({ status, count: rows.find((row) => row._id === status)?.count ?? 0 }));
}
