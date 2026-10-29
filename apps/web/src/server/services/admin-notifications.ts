import "server-only";

import type { AdminDto, BookingDto } from "@district-viii/shared";
import { AdminBookingNotificationModel, type AdminBookingNotificationRecord } from "../models";
import { bumpLive } from "../live";
import { scheduleBookingPush } from "../web-push";

export interface AdminNotificationDto {
  id: string;
  title: string;
  message: string;
  bookingId: string;
  booking: AdminBookingNotificationRecord["booking"];
  createdAt: string;
  isRead: boolean;
}

/** Returns true only for the first insert, so retries cannot deliver duplicate push events. */
export async function recordAdminBookingNotification(booking: BookingDto): Promise<boolean> {
  const result = await AdminBookingNotificationModel.updateOne(
    { bookingId: booking.id },
    {
      $setOnInsert: {
        bookingId: booking.id,
        title: "New Booking Received",
        message: `${booking.customerName} booked ${booking.unitName} for ${booking.businessDate} at ${booking.startHour}:00.`,
        booking: {
          customerName: booking.customerName,
          unitName: booking.unitName,
          unitType: booking.unitType,
          businessDate: booking.businessDate,
          startHour: booking.startHour,
          durationHours: booking.durationHours,
          status: booking.status,
        },
        readBy: [],
      },
    },
    { upsert: true },
  ).exec();
  return result.upsertedCount === 1;
}

export function scheduleNewBookingNotification(booking: BookingDto): void {
  scheduleBookingPush(booking);
}

export async function updateBookingNotificationStatus(bookingId: string, status: BookingDto["status"]): Promise<void> {
  try {
    await AdminBookingNotificationModel.updateOne(
      { bookingId },
      { $set: { "booking.status": status } },
    ).exec();
  } catch (error) {
    console.error(`Could not update admin notification status for booking ${bookingId}`, error);
  }
}

function toDto(row: AdminBookingNotificationRecord, adminId: string): AdminNotificationDto {
  return {
    id: String(row._id),
    title: row.title,
    message: row.message,
    bookingId: String(row.bookingId),
    booking: row.booking,
    createdAt: row.createdAt.toISOString(),
    isRead: row.readBy.some((id) => String(id) === adminId),
  };
}

export async function listAdminNotifications(admin: AdminDto) {
  const [rows, unreadCount] = await Promise.all([
    AdminBookingNotificationModel.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .lean<AdminBookingNotificationRecord[]>()
      .exec(),
    AdminBookingNotificationModel.countDocuments({ readBy: { $ne: admin.id } }).exec(),
  ]);
  return { items: rows.map((row) => toDto(row, admin.id)), unreadCount };
}

export async function markAdminNotificationRead(id: string, admin: AdminDto): Promise<void> {
  await AdminBookingNotificationModel.updateOne({ _id: id }, { $addToSet: { readBy: admin.id } }).exec();
  await bumpLive();
}

export async function markAllAdminNotificationsRead(admin: AdminDto): Promise<void> {
  await AdminBookingNotificationModel.updateMany(
    { readBy: { $ne: admin.id } },
    { $addToSet: { readBy: admin.id } },
  ).exec();
  await bumpLive();
}
