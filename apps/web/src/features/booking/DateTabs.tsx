"use client";

import { formatBusinessDate, formatShortDate, type IsoDate } from "@district-viii/shared";
import { motion } from "framer-motion";

interface DateTabsProps {
  dates: IsoDate[];
  today: IsoDate;
  selected: IsoDate;
  onSelect: (date: IsoDate) => void;
}

export function DateTabs({ dates, today, selected, onSelect }: DateTabsProps) {
  return (
    <div role="group" aria-label="Choose a date" className="flex gap-2 lg:grid lg:grid-cols-3 lg:gap-3">
      {dates.map((date) => {
        const active = date === selected;
        const label = formatBusinessDate(date, today);
        const detail = formatShortDate(date).split(" ").slice(1).join(" ");
        return (
          <button
            key={date}
            type="button"
            aria-pressed={active}
            aria-label={`${label}, ${formatShortDate(date)}`}
            onClick={() => onSelect(date)}
            className={`relative flex flex-1 flex-col items-center rounded-full px-3 py-2 transition-[color,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blush active:scale-95 ${
              active ? "text-burgundy" : "text-white"
            }`}
          >
            {active && (
              <motion.span
                layoutId="date-tab-active"
                aria-hidden
                className="absolute inset-0 rounded-full bg-white shadow-handle"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            {!active && <span aria-hidden className="absolute inset-0 rounded-full border border-white/15" />}
            <span className="relative text-sm font-bold">{label === formatShortDate(date) ? label.split(" ")[0] : label}</span>
            <span className={`relative text-[10px] font-semibold ${active ? "text-burgundy/80" : "text-blush/80"}`}>{detail}</span>
          </button>
        );
      })}
    </div>
  );
}
