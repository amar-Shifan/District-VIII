import { type BookingDto, HOUR_MS } from '@district-viii/shared';
import type { BookingRecord } from './booking.schema';

export function toBookingDto(
  booking: BookingRecord,
  unitName: string,
): BookingDto {
  return {
    id: String(booking._id),
    unitId: String(booking.unitId),
    unitName,
    unitType: booking.unitType,
    businessDate: booking.businessDate,
    startHour: booking.startHour,
    durationHours: booking.durationHours,
    startsAt: booking.startsAt.toISOString(),
    endsAt: new Date(
      booking.startsAt.getTime() + booking.durationHours * HOUR_MS,
    ).toISOString(),
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    status: booking.status,
    source: booking.source,
    rejectionReason: booking.rejectionReason ?? null,
    approvedAt: booking.approvedAt ? booking.approvedAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}
