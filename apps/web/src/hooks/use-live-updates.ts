"use client";

import { SOCKET_EVENTS } from "@district-viii/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { USE_MOCK } from "@/lib/config";
import { queryKeys } from "@/lib/query-keys";
import { getPublicSocket } from "@/lib/socket";

/**
 * Keeps customer screens live: any availability, unit or booking event from
 * the API invalidates the affected queries, which refetch in the background.
 * Polling (refetchInterval) remains as a fallback when the socket is down.
 */
export function useLiveUpdates(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (USE_MOCK) return;
    const socket = getPublicSocket();
    const refreshAvailability = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitsSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availabilityAll });
    };
    const refreshBookings = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookingsAll });
    };

    socket.on(SOCKET_EVENTS.availabilityChanged, refreshAvailability);
    socket.on(SOCKET_EVENTS.unitUpdated, refreshAvailability);
    socket.on(SOCKET_EVENTS.bookingUpdated, refreshBookings);
    // Catch up on anything missed while disconnected.
    socket.on("connect", refreshAvailability);
    return () => {
      socket.off(SOCKET_EVENTS.availabilityChanged, refreshAvailability);
      socket.off(SOCKET_EVENTS.unitUpdated, refreshAvailability);
      socket.off(SOCKET_EVENTS.bookingUpdated, refreshBookings);
      socket.off("connect", refreshAvailability);
    };
  }, [queryClient]);
}
