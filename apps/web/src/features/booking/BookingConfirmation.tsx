"use client";

import { type BookingDto, formatPhone } from "@district-viii/shared";
import { motion } from "framer-motion";
import { useRef } from "react";
import { PillButton, PillLink } from "@/components/PillButton";
import { StatusPill } from "@/components/StatusPill";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface BookingConfirmationProps {
  booking: BookingDto;
  dateLabel: string;
  timeLabel: string;
  onClose: () => void;
}

/** Full-screen success state with an animated burgundy check. */
export function BookingConfirmation({ booking, dateLabel, timeLabel, onClose }: BookingConfirmationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true, onClose);

  return (
    <motion.div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-confirmed-title"
      className="absolute inset-0 z-50 flex flex-col bg-ink px-6 pt-[calc(var(--safe-top)+48px)] pb-[calc(var(--safe-bottom)+24px)] lg:items-center lg:justify-center lg:gap-8 lg:px-10 lg:py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />

      <div className="relative flex flex-1 flex-col items-center justify-center text-center lg:flex-none">
        <motion.svg
          viewBox="0 0 120 120"
          className="size-32 drop-shadow-[0_0_30px_var(--color-burgundy-bright)]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          aria-hidden
        >
          <circle cx="60" cy="60" r="56" className="fill-burgundy stroke-burgundy-bright" strokeWidth="4" />
          <motion.path
            d="M36 62 L53 78 L85 44"
            fill="none"
            className="stroke-white"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
          />
        </motion.svg>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <h2 id="booking-confirmed-title" className="text-glow mt-8 -skew-x-8 font-display text-5xl leading-none text-white">
            Request sent
          </h2>
          <p className="mt-3 text-blush" role="status">
            Waiting for admin approval
          </p>
        </motion.div>

        <motion.dl
          className="bg-card-gradient mt-8 w-full rounded-card border border-white/10 p-5 text-left shadow-card lg:max-w-3xl lg:p-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <dt className="sr-only">Status</dt>
            <dd className="-skew-x-8 font-display text-2xl text-white">{booking.unitName}</dd>
            <dd>
              <StatusPill variant="busy" label="Pending" />
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Date", dateLabel],
              ["Time", timeLabel],
              ["Name", booking.customerName],
              ["Phone", formatPhone(booking.customerPhone)],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-[10px] font-bold tracking-[0.2em] text-blush uppercase">{term}</dt>
                <dd className="mt-0.5 font-bold text-white">{value}</dd>
              </div>
            ))}
          </div>
        </motion.dl>
      </div>

      <motion.div
        className="relative grid gap-2.5 lg:w-full lg:max-w-3xl lg:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
      >
        <PillLink href="/my-booking" variant="light">
          My booking
        </PillLink>
        <PillButton type="button" variant="ghost" onClick={onClose} data-autofocus>
          Book another slot
        </PillButton>
      </motion.div>
    </motion.div>
  );
}
