"use client";

import {
  type BookingCreatedPayload,
  formatShortDate,
  formatSlotRange,
  SOCKET_EVENTS,
} from "@district-viii/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { createAdminSocket } from "@/lib/socket";
import { useToast } from "./Toaster";

/**
 * Connects the admin socket (joins the admin room with a short-lived token),
 * toasts new booking requests and refreshes admin data on every change.
 */
export function AdminRealtime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const socket = createAdminSocket(async () => (await adminApi.socketToken()).token);
    const refresh = (...keys: (readonly string[])[]) => {
      for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
    };

    const onCreated = (booking: BookingCreatedPayload) => {
      if (booking.status === "pending") {
        toast({
          title: `New request · ${booking.unitName}`,
          description: `${booking.customerName}, ${formatShortDate(booking.businessDate)} · ${formatSlotRange(booking.startHour, booking.durationHours)}`,
        });
      }
      refresh(adminKeys.stats, adminKeys.bookingsAll, adminKeys.charts, adminKeys.availabilityAll);
    };
    const onBookingUpdated = () =>
      refresh(adminKeys.stats, adminKeys.bookingsAll, adminKeys.charts, adminKeys.availabilityAll);
    const onUnitUpdated = () => refresh(adminKeys.units, adminKeys.stats, adminKeys.availabilityAll);
    const onAvailability = () => refresh(adminKeys.availabilityAll, adminKeys.blockedSlotsAll);

    socket.on(SOCKET_EVENTS.bookingCreated, onCreated);
    socket.on(SOCKET_EVENTS.bookingUpdated, onBookingUpdated);
    socket.on(SOCKET_EVENTS.unitUpdated, onUnitUpdated);
    socket.on(SOCKET_EVENTS.availabilityChanged, onAvailability);
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [queryClient, toast]);

  return null;
}
