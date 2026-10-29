import "server-only";

import {
  type AdminDto,
  type BookingDto,
  type BookingListQuery,
  type BookingSource,
  type BookingStatus,
  businessDateOf,
  type CreateBookingInput,
  diffDays,
  HOUR_MS,
  isOperatingSlot,
  isSlotPast,
  maskPhone,
  type Paginated,
  slotStart,
} from "@district-viii/shared";
import type { FilterQuery, SortOrder } from "mongoose";
import { now } from "../clock";
import { badRequest, conflict, forbidden, isDuplicateKeyError, notFound } from "../http";
import { bumpLive } from "../live";
import { type Booking, BookingModel, type BookingRecord, BlockedSlotModel } from "../models";
import { getSettings } from "./settings";
import { recordAdminBookingNotification, scheduleNewBookingNotification, updateBookingNotificationStatus } from "./admin-notifications";
import { effectiveStatus, getUnit, unitNames } from "./units";

export const SLOT_TAKEN_MESSAGE = "Sorry, someone just requested this slot. Please pick another time.";
/** Admins may log walk-ins and phone bookings further ahead than customers. */
const ADMIN_BOOKING_DAYS_AHEAD = 30;
const CUSTOMER_HISTORY_DAYS = 14;
const CUSTOMER_HISTORY_LIMIT = 20;
const DAY_MS = 86_400_000;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toBookingDto(booking: BookingRecord, unitName: string): BookingDto {
  return {
    id: String(booking._id),
    unitId: String(booking.unitId),
    unitName,
    unitType: booking.unitType,
    businessDate: booking.businessDate,
    startHour: booking.startHour,
    durationHours: booking.durationHours,
    startsAt: booking.startsAt.toISOString(),
    endsAt: new Date(booking.startsAt.getTime() + booking.durationHours * HOUR_MS).toISOString(),
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    pricePerHour: booking.pricePerHour ?? null,
    estimatedAmount: booking.estimatedAmount ?? null,
    status: booking.status,
    source: booking.source,
    rejectionReason: booking.rejectionReason ?? null,
    approvedAt: booking.approvedAt ? booking.approvedAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

async function withNames(rows: BookingRecord[]): Promise<BookingDto[]> {
  const names = await unitNames();
  return rows.map((row) => toBookingDto(row, names.get(String(row.unitId)) ?? "Removed unit"));
}

export async function createBooking(input: CreateBookingInput, source: BookingSource): Promise<BookingDto> {
  const at = now();
  const settings = await getSettings();
  const unit = await getUnit(input.unitId);

  if (!unit.isActive) throw badRequest("This unit is not open for booking");
  const status = effectiveStatus(unit, at);
  if (status === "maintenance") throw conflict(`${unit.name} is under maintenance`);
  if (!isOperatingSlot(input.startHour, settings)) throw badRequest("That time is outside operating hours");

  const dayOffset = diffDays(businessDateOf(at, settings), input.businessDate);
  const maxOffset = source === "online" ? settings.bookingWindowDays - 1 : ADMIN_BOOKING_DAYS_AHEAD;
  if (dayOffset < 0 || dayOffset > maxOffset) {
    throw badRequest(
      source === "online"
        ? `Bookings are open for the next ${settings.bookingWindowDays} day(s) only`
        : `Walk-in bookings can be made up to ${ADMIN_BOOKING_DAYS_AHEAD} days ahead`,
    );
  }

  const startsAt = slotStart(input.businessDate, input.startHour, settings);
  const pricePerHour = unit.type === "ps5" ? settings.ps5PricePerHour : settings.poolPricePerHour;
  const estimatedAmount = pricePerHour === null ? null : Number((pricePerHour * settings.slotDurationHours).toFixed(2));
  if (isSlotPast(startsAt, at)) throw badRequest("This slot has already started");
  if (status === "busy" && unit.busyUntil && unit.busyUntil > startsAt) {
    throw conflict(`${unit.name} is in use at that time`);
  }
  const blocked = await BlockedSlotModel.exists({
    unitId: unit._id,
    businessDate: input.businessDate,
    startHour: input.startHour,
  }).exec();
  if (blocked) throw conflict("This slot is not available");

  let created: BookingRecord;
  try {
    const doc = await BookingModel.create({
      unitId: unit._id,
      unitType: unit.type,
      businessDate: input.businessDate,
      startHour: input.startHour,
      durationHours: settings.slotDurationHours,
      startsAt,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      pricePerHour,
      estimatedAmount,
      status: source === "walk-in" ? "approved" : "pending",
      source,
      approvedAt: source === "walk-in" ? at : null,
    });
    created = doc.toObject<BookingRecord>();
  } catch (error) {
    if (isDuplicateKeyError(error)) throw conflict(SLOT_TAKEN_MESSAGE);
    throw error;
  }

  const dto = toBookingDto(created, unit.name);
  console.log(`Booking ${dto.id} created (${source}) for ${maskPhone(dto.customerPhone)}`);
  let notificationCreated = false;
  try {
    notificationCreated = await recordAdminBookingNotification(dto);
  } catch (error) {
    // The booking is already persisted; notification delivery must not make the customer retry it.
    console.error(`Could not create admin notification for booking ${dto.id}`, error);
  }
  if (notificationCreated) {
    scheduleNewBookingNotification(dto);
  }
  await bumpLive();
  return dto;
}

export async function listBookings(query: BookingListQuery): Promise<Paginated<BookingDto>> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const filter: FilterQuery<Booking> = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.unitType = query.type;
  if (query.from || query.to) {
    filter.businessDate = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }
  if (query.search) {
    const digits = query.search.replace(/\D/g, "");
    const or: FilterQuery<Booking>[] = [{ customerName: { $regex: escapeRegex(query.search), $options: "i" } }];
    if (digits.length >= 3) or.push({ customerPhone: { $regex: escapeRegex(digits.slice(-10)) } });
    filter.$or = or;
  }

  const direction: SortOrder = query.order === "asc" ? 1 : -1;
  const sortField = query.sort ?? "createdAt";
  const sort: Record<string, SortOrder> =
    sortField === "businessDate"
      ? { businessDate: direction, startsAt: direction }
      : { [sortField]: direction, _id: direction };

  const [total, rows] = await Promise.all([
    BookingModel.countDocuments(filter).exec(),
    BookingModel.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<BookingRecord[]>()
      .exec(),
  ]);

  return {
    items: await withNames(rows),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Atomic status change: only applies when the booking is still in one of `from`. */
async function transition(
  id: string,
  from: BookingStatus[],
  update: Partial<Pick<Booking, "status" | "approvedAt" | "rejectionReason">>,
): Promise<BookingDto> {
  const updated = await BookingModel.findOneAndUpdate({ _id: id, status: { $in: from } }, { $set: update }, { new: true })
    .lean<BookingRecord>()
    .exec();
  if (!updated) {
    const existing = await BookingModel.findById(id, { status: 1 }).lean<BookingRecord>().exec();
    if (!existing) throw notFound("Booking not found");
    throw conflict(`This booking is already ${existing.status}`);
  }
  const [dto] = await withNames([updated]);
  await updateBookingNotificationStatus(id, updated.status);
  await bumpLive();
  return dto as BookingDto;
}

export function approveBooking(id: string): Promise<BookingDto> {
  return transition(id, ["pending"], { status: "approved", approvedAt: now() });
}

export function rejectBooking(id: string, reason?: string): Promise<BookingDto> {
  return transition(id, ["pending"], { status: "rejected", rejectionReason: reason || null });
}

/** Admins can cancel pending or approved bookings; customers only their own pending ones. */
export async function cancelBooking(id: string, actor: { admin?: AdminDto | null; phone?: string }): Promise<BookingDto> {
  if (actor.admin) return transition(id, ["pending", "approved"], { status: "cancelled" });

  if (!actor.phone) throw badRequest("phone is required to cancel a booking");
  const booking = await BookingModel.findById(id).lean<BookingRecord>().exec();
  if (!booking) throw notFound("Booking not found");
  if (booking.customerPhone !== actor.phone) throw forbidden("This booking belongs to a different phone number");
  return transition(id, ["pending"], { status: "cancelled" });
}

export async function bookingsByPhone(phone: string): Promise<BookingDto[]> {
  const since = new Date(now().getTime() - CUSTOMER_HISTORY_DAYS * DAY_MS);
  const rows = await BookingModel.find({ customerPhone: phone, startsAt: { $gte: since } })
    .sort({ startsAt: -1 })
    .limit(CUSTOMER_HISTORY_LIMIT)
    .lean<BookingRecord[]>()
    .exec();
  return withNames(rows);
}

/** Pending requests created after `since`, oldest first: drives the admin "new request" toasts. */
export async function pendingCreatedSince(since: Date): Promise<BookingDto[]> {
  const rows = await BookingModel.find({ status: "pending", createdAt: { $gt: since } })
    .sort({ createdAt: 1 })
    .limit(10)
    .lean<BookingRecord[]>()
    .exec();
  return withNames(rows);
}
