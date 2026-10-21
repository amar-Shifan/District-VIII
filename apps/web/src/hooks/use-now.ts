"use client";

import { useEffect, useState } from "react";

/**
 * Current time, refreshed every `intervalMs`. Starts as null so server and
 * first client render match; time-dependent UI renders after mount.
 */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}

/** "4:05" or "1:02:09" until `target`; "0:00" once passed. */
export function formatCountdown(target: string | Date, now: Date): string {
  const remaining = Math.max(0, Math.floor((new Date(target).getTime() - now.getTime()) / 1000));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = String(remaining % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}
