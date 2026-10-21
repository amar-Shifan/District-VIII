"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getLiveRevision } from "@/lib/api";
import { LIVE_POLL_MS, USE_MOCK } from "@/lib/config";
import { queryKeys } from "@/lib/query-keys";

/**
 * Keeps customer screens live without sockets: polls the API's change counter
 * every few seconds (a single tiny read) and, when it moves, refreshes
 * availability, the Home summary and the customer's bookings.
 */
export function useLiveUpdates(): void {
  const queryClient = useQueryClient();
  const live = useQuery({
    queryKey: queryKeys.live,
    queryFn: getLiveRevision,
    refetchInterval: LIVE_POLL_MS,
    enabled: !USE_MOCK,
  });
  const lastRevision = useRef<number | null>(null);
  const revision = live.data?.revision;

  useEffect(() => {
    if (revision === undefined) return;
    if (lastRevision.current !== null && lastRevision.current !== revision) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitsSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availabilityAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookingsAll });
    }
    lastRevision.current = revision;
  }, [revision, queryClient]);
}
