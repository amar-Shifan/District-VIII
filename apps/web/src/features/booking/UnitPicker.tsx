"use client";

import type { UnitSlotsDto } from "@district-viii/shared";
import { motion } from "framer-motion";
import { StatusPill, type StatusPillVariant } from "@/components/StatusPill";
import { formatCountdown, useNow } from "@/hooks/use-now";

function liveStatus(entry: UnitSlotsDto, isToday: boolean, now: Date | null): { variant: StatusPillVariant; label?: string } {
  const { unit, slots } = entry;
  if (unit.status === "maintenance") return { variant: "maintenance" };
  if (now && unit.status === "busy" && unit.busyUntil && Date.parse(unit.busyUntil) > now.getTime()) {
    return { variant: "busy", label: `Busy ${formatCountdown(unit.busyUntil, now)}` };
  }
  if (isToday && now) {
    const current = slots.find(
      (slot) => now.getTime() >= Date.parse(slot.startsAt) && now.getTime() < Date.parse(slot.endsAt),
    );
    if (current?.state === "booked" || current?.state === "pending") return { variant: "booked" };
  }
  return { variant: "available" };
}

interface UnitPickerProps {
  units: UnitSlotsDto[];
  selectedId: string | undefined;
  isToday: boolean;
  onSelect: (unitId: string) => void;
}

/** Row of unit cards with live status; scrolls horizontally when there are more than three. */
export function UnitPicker({ units, selectedId, isToday, onSelect }: UnitPickerProps) {
  const now = useNow(1000);
  // Up to three units share the row evenly; more than that becomes a snap carousel.
  const fits = units.length <= 3;

  return (
    <div role="group" aria-label="Choose a unit" className={`flex gap-2 ${fits ? "" : "-mx-4 snap-x overflow-x-auto px-4 pb-1 [scrollbar-width:none]"}`}>
      {units.map((entry, index) => {
        const selected = entry.unit.id === selectedId;
        const status = liveStatus(entry, isToday, now);
        return (
          <motion.button
            key={entry.unit.id}
            type="button"
            aria-pressed={selected}
            aria-label={`${entry.unit.name}, ${status.label ?? status.variant}`}
            onClick={() => onSelect(entry.unit.id)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-card-sm border p-3 text-left ${fits ? "min-w-0 flex-1" : "w-[31%] shrink-0 snap-start"} transition-[border-color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blush active:scale-[0.97] ${
              selected ? "bg-card-gradient border-burgundy-bright shadow-card" : "border-white/10 bg-white/4 hover:border-white/25"
            }`}
          >
            <span className="block truncate -skew-x-8 font-display text-[22px] leading-none text-white">
              {entry.unit.name}
            </span>
            <span className="mt-2.5 block">
              <StatusPill variant={status.variant} label={status.label} size="sm" />
            </span>
            {selected && (
              <motion.span
                layoutId="unit-picker-selected"
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-card-sm ring-1 ring-blush/40"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
