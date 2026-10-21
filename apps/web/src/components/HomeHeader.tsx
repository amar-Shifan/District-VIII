"use client";

import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { VENUE } from "@/lib/venue";

interface HomeHeaderProps {
  hasPendingBooking: boolean;
}

export function HomeHeader({ hasPendingBooking }: HomeHeaderProps) {
  return (
    <motion.header
      className="relative z-10 mx-4 mt-[calc(var(--safe-top)+12px)] rounded-full"
      initial={{ y: -110, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16, mass: 0.9 }}
    >
      <div className="relative flex items-center justify-between gap-3 rounded-full border border-burgundy/60 bg-ink/60 py-2 pr-2 pl-6 shadow-glow backdrop-blur-xl">
        <div className="min-w-0">
          <p className="text-shine -skew-x-8 font-display text-[26px] leading-none motion-safe:animate-shine">
            {VENUE.wordmark}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-blush">
            <span aria-hidden className="relative flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-burgundy-bright motion-safe:animate-ping-soft" />
              <span className="relative size-1.5 rounded-full bg-white motion-safe:animate-dot-pulse" />
            </span>
            <span>
              <span className="sr-only">Open now. </span>Tonight · till {VENUE.closesAtLabel}
            </span>
          </p>
        </div>

        <Link
          href="/my-booking"
          aria-label={hasPendingBooking ? "My booking, you have a pending booking" : "My booking"}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-burgundy px-4 py-3 text-sm font-bold text-white shadow-glow transition-transform duration-200 outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-blush active:scale-95"
        >
          {hasPendingBooking && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-burgundy-bright motion-safe:animate-ping-soft"
            />
          )}
          <CalendarDays aria-hidden strokeWidth={2.25} className="size-4" />
          My booking
        </Link>
      </div>
      <span aria-hidden className="border-glow" />
    </motion.header>
  );
}
