"use client";

import { formatShortDate, formatSlotRange } from "@district-viii/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { LIVE_POLL_MS } from "@/lib/config";
import { useToast } from "./Toaster";

/**
 * Live admin updates without sockets: polls /api/admin/live every few
 * seconds. New pending requests show as toasts; any change refreshes the
 * dashboard, bookings, units, availability and blocked slots.
 */
export function AdminRealtime() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const since = useRef<string | undefined>(undefined);
  const lastRevision = useRef<number | null>(null);

  const live = useQuery({
    queryKey: [...adminKeys.all, "live"],
    queryFn: () => adminApi.live(since.current),
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  useEffect(() => {
    const data = live.data;
    if (!data) return;
    // The first poll only sets the baseline; later polls report what is new since then.
    if (since.current !== undefined) {
      for (const booking of data.newRequests) {
        toast({
          title: `New request · ${booking.unitName}`,
          description: `${booking.customerName}, ${formatShortDate(booking.businessDate)} · ${formatSlotRange(booking.startHour, booking.durationHours)}`,
        });
      }
    }
    since.current = data.serverTime;

    if (lastRevision.current !== null && lastRevision.current !== data.revision) {
      for (const queryKey of [
        adminKeys.stats,
        adminKeys.bookingsAll,
        adminKeys.charts,
        adminKeys.units,
        adminKeys.availabilityAll,
        adminKeys.blockedSlotsAll,
        adminKeys.food,
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
    lastRevision.current = data.revision;
  }, [live.data, queryClient, toast]);

  return null;
}
