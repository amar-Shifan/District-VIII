"use client";

import { formatHour, formatSlotRange, type SlotDto, type SlotState } from "@district-viii/shared";
import { motion } from "framer-motion";

const STATE_LABEL: Record<SlotState, string> = {
  available: "available",
  pending: "pending approval",
  booked: "booked",
  busy: "unavailable",
  maintenance: "under maintenance",
  past: "already started",
};

const CAPTION: Partial<Record<SlotState, string>> = {
  pending: "Pending",
  booked: "Booked",
  busy: "Busy",
  maintenance: "Repair",
};

function slotClasses(state: SlotState, selected: boolean): string {
  if (selected) return "border-burgundy-bright bg-burgundy text-white shadow-glow";
  switch (state) {
    case "available":
      return "border-white/70 text-white hover:border-white hover:bg-white/8";
    case "pending":
      return "border-burgundy-bright text-blush";
    case "past":
      return "border-white/8 text-white/25";
    default:
      return "border-white/10 bg-white/4 text-white/35";
  }
}

interface SlotGridProps {
  slots: SlotDto[];
  durationHours: number;
  /** Opening hour, to split after-midnight slots into their own group. */
  openHour: number;
  selectedHour: number | null;
  onSelect: (slot: SlotDto) => void;
}

export function SlotGrid({ slots, durationHours, openHour, selectedHour, onSelect }: SlotGridProps) {
  const evening = slots.filter((slot) => slot.startHour >= openHour);
  const late = slots.filter((slot) => slot.startHour < openHour);

  const renderGroup = (group: SlotDto[], offset: number) => (
    <div className="grid grid-cols-4 gap-2">
      {group.map((slot, index) => {
        const selected = slot.startHour === selectedHour;
        const caption = CAPTION[slot.state];
        return (
          <motion.button
            key={slot.startHour}
            type="button"
            disabled={slot.state !== "available"}
            aria-pressed={selected}
            aria-label={`${formatSlotRange(slot.startHour, durationHours)}, ${STATE_LABEL[slot.state]}`}
            onClick={() => onSelect(slot)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (offset + index) * 0.018, duration: 0.3 }}
            className={`relative flex h-14 flex-col items-center justify-center rounded-2xl border text-sm font-bold transition-[background-color,border-color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blush active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${slotClasses(slot.state, selected)}`}
          >
            {slot.state === "pending" && (
              <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-burgundy-bright motion-safe:animate-dot-pulse" />
            )}
            <span className={slot.state === "booked" ? "line-through decoration-white/40" : undefined}>
              {formatHour(slot.startHour)}
            </span>
            {caption && <span className="text-[9px] font-semibold tracking-wider uppercase opacity-80">{caption}</span>}
          </motion.button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderGroup(evening, 0)}
      {late.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[0.24em] text-blush/80 uppercase">After midnight</p>
          {renderGroup(late, evening.length)}
        </div>
      )}
    </div>
  );
}

export function SlotLegend() {
  const items: { label: string; swatch: string }[] = [
    { label: "Open", swatch: "border border-white/70" },
    { label: "Selected", swatch: "bg-burgundy border border-burgundy-bright" },
    { label: "Pending", swatch: "border border-burgundy-bright" },
    { label: "Taken", swatch: "bg-white/10" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Slot legend">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[10px] font-semibold text-blush/80">
          <span aria-hidden className={`size-3 rounded-[5px] ${item.swatch}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
