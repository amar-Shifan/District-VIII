"use client";

import {
  type BookingDto,
  type BookingStatus,
  formatBusinessDate,
  formatSlotRange,
  type IsoDate,
} from "@district-viii/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Gamepad2, Loader2 } from "lucide-react";
import { useState } from "react";
import { EightBallIcon } from "@/components/icons/EightBallIcon";
import { cancelBooking } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

const STATUS_STYLE: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "border border-burgundy-bright text-white" },
  approved: { label: "Approved", className: "bg-white text-burgundy" },
  rejected: { label: "Rejected", className: "bg-ink text-white" },
  cancelled: { label: "Cancelled", className: "bg-white/10 text-blush" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${style.className}`}>
      {status === "pending" && (
        <span aria-hidden className="size-1.5 rounded-full bg-burgundy-bright motion-safe:animate-dot-pulse" />
      )}
      {status === "approved" && <Check aria-hidden strokeWidth={3} className="size-3" />}
      {style.label}
    </span>
  );
}

interface BookingCardProps {
  booking: BookingDto;
  phone: string;
  today: IsoDate | null;
  canCancel: boolean;
  index: number;
}

export function BookingCard({ booking, phone, today, canCancel, index }: BookingCardProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation({
    mutationFn: () => cancelBooking(booking.id, phone),
    onSettled: () => {
      setConfirming(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookingsAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availabilityAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitsSummary });
    },
  });

  const Icon = booking.unitType === "pool" ? EightBallIcon : Gamepad2;
  const dateLabel = today ? formatBusinessDate(booking.businessDate, today) : booking.businessDate;

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-card-sm border p-4 shadow-card ${
        booking.status === "pending" || booking.status === "approved"
          ? "bg-card-gradient border-white/10"
          : "border-white/8 bg-white/4"
      }`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 text-white">
          <Icon strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="-skew-x-8 font-display text-xl leading-tight text-white">{booking.unitName}</h2>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-1 text-sm font-semibold text-white">
            {dateLabel} · {formatSlotRange(booking.startHour, booking.durationHours)}
          </p>
          {booking.status === "pending" && <p className="mt-1 text-xs text-blush">Waiting for admin approval</p>}
          {booking.status === "approved" && <p className="mt-1 text-xs text-blush">See you at the arena. Show this at the counter.</p>}
          {booking.status === "rejected" && (
            <p className="mt-1 text-xs text-blush">{booking.rejectionReason ? `Reason: ${booking.rejectionReason}` : "This request was declined."}</p>
          )}
        </div>
      </div>

      {canCancel && booking.status === "pending" && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
          {mutation.isError && (
            <p role="alert" className="mr-auto text-xs font-semibold text-white">
              {errorMessage(mutation.error)}
            </p>
          )}
          {confirming ? (
            <>
              <span className="mr-auto text-xs text-blush">Cancel this request?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-9 rounded-full px-4 text-xs font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-blush"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-bold text-burgundy outline-none focus-visible:ring-2 focus-visible:ring-blush active:scale-95"
              >
                {mutation.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
                Yes, cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-9 rounded-full border border-white/20 px-4 text-xs font-bold text-white outline-none hover:border-blush/60 focus-visible:ring-2 focus-visible:ring-blush active:scale-95"
            >
              Cancel request
            </button>
          )}
        </div>
      )}
    </motion.li>
  );
}
