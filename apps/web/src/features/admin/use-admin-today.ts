"use client";

import { businessDateOf, type IsoDate, type SettingsDto } from "@district-viii/shared";
import { useQuery } from "@tanstack/react-query";
import { useNow } from "@/hooks/use-now";
import { adminApi, adminKeys } from "@/lib/admin-api";

/** Current business date and settings for admin screens (null until both are known). */
export function useAdminToday(): { today: IsoDate | null; settings: SettingsDto | undefined; now: Date | null } {
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings, staleTime: 60_000 });
  const now = useNow(30_000);
  return {
    today: settings.data && now ? businessDateOf(now, settings.data) : null,
    settings: settings.data,
    now,
  };
}
