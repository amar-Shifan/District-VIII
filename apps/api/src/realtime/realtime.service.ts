import {
  ADMIN_ROOM,
  type AvailabilityChangedPayload,
  type BookingDto,
  type BookingUpdatedPayload,
  SOCKET_EVENTS,
  type UnitDto,
} from '@district-viii/shared';
import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Thin facade over the socket.io server so domain services can emit events
 * without depending on the gateway. A no-op until the gateway attaches
 * (for example in the seed script).
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  availabilityChanged(payload: AvailabilityChangedPayload): void {
    this.server?.emit(SOCKET_EVENTS.availabilityChanged, payload);
  }

  bookingCreated(booking: BookingDto): void {
    // Full booking (with customer details) goes to admins only.
    this.server?.to(ADMIN_ROOM).emit(SOCKET_EVENTS.bookingCreated, booking);
    this.availabilityChanged({
      unitType: booking.unitType,
      businessDate: booking.businessDate,
    });
  }

  bookingUpdated(booking: BookingDto): void {
    const payload: BookingUpdatedPayload = {
      id: booking.id,
      status: booking.status,
      unitType: booking.unitType,
      businessDate: booking.businessDate,
    };
    this.server?.emit(SOCKET_EVENTS.bookingUpdated, payload);
    this.availabilityChanged({
      unitType: booking.unitType,
      businessDate: booking.businessDate,
    });
  }

  unitUpdated(unit: UnitDto): void {
    this.server?.emit(SOCKET_EVENTS.unitUpdated, unit);
    this.availabilityChanged({ unitType: unit.type });
  }
}
