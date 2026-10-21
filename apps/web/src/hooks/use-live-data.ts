"use client";

import type { IsoDate, UnitType } from "@district-viii/shared";
import { useQuery } from "@tanstack/react-query";
import {
  getAvailability,
  getBookingsByPhone,
  getFood,
  getFoodCategories,
  getMyBookingStatus,
  getPublicSettings,
  getUnitsSummary,
} from "@/lib/api";
import { LIVE_REFETCH_MS } from "@/lib/config";
import { queryKeys } from "@/lib/query-keys";

export function useUnitsSummary() {
  return useQuery({
    queryKey: queryKeys.unitsSummary,
    queryFn: getUnitsSummary,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useMyBookingStatus(phone: string | null) {
  return useQuery({
    queryKey: queryKeys.myBookingStatus(phone),
    queryFn: () => getMyBookingStatus(phone),
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useAvailability(type: UnitType, date: IsoDate | null) {
  return useQuery({
    queryKey: queryKeys.availability(type, date ?? ""),
    queryFn: () => getAvailability(type, date ?? ""),
    enabled: date !== null,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useMyBookings(phone: string | null) {
  return useQuery({
    queryKey: queryKeys.myBookings(phone ?? ""),
    queryFn: () => getBookingsByPhone(phone ?? ""),
    enabled: phone !== null,
    refetchInterval: LIVE_REFETCH_MS,
  });
}

export function useFood() {
  return useQuery({ queryKey: queryKeys.food, queryFn: getFood, staleTime: 60_000 });
}

export function useFoodCategories() {
  return useQuery({ queryKey: queryKeys.foodCategories, queryFn: getFoodCategories, staleTime: 60_000 });
}

export function usePublicSettings() {
  return useQuery({ queryKey: queryKeys.publicSettings, queryFn: getPublicSettings, staleTime: 5 * 60_000 });
}
