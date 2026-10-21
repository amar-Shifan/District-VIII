import type { BookingDto, IsoDate, UnitDto } from "./dto";
import type { BookingStatus, UnitType } from "./enums";

export const SOCKET_EVENTS = {
  availabilityChanged: "availability:changed",
  bookingCreated: "booking:created",
  bookingUpdated: "booking:updated",
  unitUpdated: "unit:updated",
} as const;

/** Room that only authenticated admin sockets join. Events carrying customer data go here only. */
export const ADMIN_ROOM = "admins";

/** Broadcast to everyone. No customer data. */
export interface AvailabilityChangedPayload {
  unitType?: UnitType;
  businessDate?: IsoDate;
}

/** Broadcast to everyone. Customers match on `id` to refresh their own bookings. */
export interface BookingUpdatedPayload {
  id: string;
  status: BookingStatus;
  unitType: UnitType;
  businessDate: IsoDate;
}

/** Sent to the admin room only. */
export type BookingCreatedPayload = BookingDto;

export type UnitUpdatedPayload = UnitDto;
