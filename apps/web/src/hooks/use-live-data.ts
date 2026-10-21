"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyBookingStatus, getUnitsSummary } from "@/lib/api";
import { LIVE_REFETCH_MS } from "@/lib/config";
import { queryKeys } from "@/lib/query-keys";

export function useUnitsSummary() {
  return useQuery({
    queryKey: queryKeys.unitsSummary,
    queryFn: getUnitsSummary,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useMyBookingStatus() {
  return useQuery({
    queryKey: queryKeys.myBookingStatus,
    queryFn: getMyBookingStatus,
    refetchInterval: LIVE_REFETCH_MS,
  });
}
