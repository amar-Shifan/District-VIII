"use client";

import {
  bookableDates,
  type BookingDto,
  formatBusinessDate,
  formatSlotRange,
  type IsoDate,
  type SlotDto,
  UNIT_TYPE_LABELS,
  type UnitType,
} from "@district-viii/shared";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarX2, WifiOff } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { PillButton } from "@/components/PillButton";
import { LiveIndicator, ScreenHeader } from "@/components/ScreenHeader";
import { Shimmer, StateMessage } from "@/components/StateMessage";
import { useAvailability, usePublicSettings } from "@/hooks/use-live-data";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useNow } from "@/hooks/use-now";
import { useCustomerProfile } from "@/lib/customer-profile";
import { BookingConfirmation } from "./BookingConfirmation";
import { BookingForm, type SlotSelection } from "./BookingForm";
import { DateTabs } from "./DateTabs";
import { SlotGrid, SlotLegend } from "./SlotGrid";
import { UnitPicker } from "./UnitPicker";

const UNIT_NOUN: Record<UnitType, string> = { pool: "table", ps5: "console" };

interface Confirmed {
  booking: BookingDto;
  dateLabel: string;
  timeLabel: string;
}

export function UnitBookingScreen({ type }: { type: UnitType }) {
  useLiveUpdates();
  const settings = usePublicSettings();
  const profile = useCustomerProfile();
  // Minute resolution is enough for picking the business date; unit countdowns tick separately.
  const now = useNow(30_000);

  const [pickedDate, setPickedDate] = useState<IsoDate | null>(null);
  const [pickedUnitId, setPickedUnitId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SlotSelection | null>(null);
  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  const dates = settings.data && now ? bookableDates(now, settings.data, settings.data.bookingWindowDays) : null;
  const today = dates?.[0] ?? null;
  const date = pickedDate && dates?.includes(pickedDate) ? pickedDate : today;
  const availability = useAvailability(type, date);

  const units = availability.data?.units ?? [];
  const active =
    units.find((entry) => entry.unit.id === pickedUnitId) ??
    units.find((entry) => entry.unit.status !== "maintenance") ??
    units[0];

  const selectSlot = (slot: SlotDto) => {
    if (!active || !date || !today || !settings.data) return;
    setSelection({
      unitId: active.unit.id,
      unitName: active.unit.name,
      businessDate: date,
      startHour: slot.startHour,
      dateLabel: formatBusinessDate(date, today),
      timeLabel: formatSlotRange(slot.startHour, settings.data.slotDurationHours),
    });
  };

  const loading = !dates || availability.isPending;

  return (
    <div className="relative flex h-full flex-col bg-ink">
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />

      <ScreenHeader
        title={UNIT_TYPE_LABELS[type]}
        subtitle={`Pick a ${UNIT_NOUN[type]}, a day and an hour`}
        action={<LiveIndicator />}
      />

      <main className="relative flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-[calc(var(--safe-bottom)+16px)]">
        {loading && !availability.isError && !settings.isError ? (
          <LoadingState />
        ) : availability.isError || settings.isError ? (
          <StateMessage
            tone="error"
            icon={WifiOff}
            title="Can't load slots"
            description="We couldn't reach the arena. Check your connection and try again."
            action={
              <PillButton variant="light" onClick={() => void availability.refetch()}>
                Try again
              </PillButton>
            }
          />
        ) : units.length === 0 || !active || !date || !today || !dates || !settings.data ? (
          <StateMessage
            icon={CalendarX2}
            title="Nothing to book"
            description={`No ${UNIT_NOUN[type]}s are open for booking right now.`}
          />
        ) : (
          <>
            <UnitPicker
              units={units}
              selectedId={active.unit.id}
              isToday={date === today}
              onSelect={(unitId) => {
                setPickedUnitId(unitId);
                setSelection(null);
              }}
            />
            <DateTabs dates={dates} today={today} selected={date} onSelect={setPickedDate} />

            <section
              aria-label={`Hourly slots for ${active.unit.name}`}
              className="flex min-h-0 flex-1 flex-col rounded-card border border-white/10 bg-white/3"
            >
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <h2 className="-skew-x-8 font-display text-xl text-white">{active.unit.name}</h2>
                <SlotLegend />
              </div>
              {/* The only scrolling region on this screen. */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1 pb-4">
                {active.unit.status === "maintenance" ? (
                  <p className="py-8 text-center text-sm text-blush">
                    {active.unit.name} is under maintenance. Pick another {UNIT_NOUN[type]}.
                  </p>
                ) : (
                  <SlotGrid
                    key={`${active.unit.id}-${date}`}
                    slots={active.slots}
                    durationHours={settings.data.slotDurationHours}
                    openHour={settings.data.openHour}
                    selectedHour={selection?.unitId === active.unit.id && selection.businessDate === date ? selection.startHour : null}
                    onSelect={selectSlot}
                  />
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomSheet
        open={selection !== null}
        onClose={() => setSelection(null)}
        title="Request booking"
        description="Your slot is held as pending until an admin approves it."
      >
        {selection && (
          <BookingForm
            key={`${selection.unitId}-${selection.businessDate}-${selection.startHour}`}
            selection={selection}
            profile={profile}
            onPickAnother={() => setSelection(null)}
            onBooked={(booking) => {
              setConfirmed({ booking, dateLabel: selection.dateLabel, timeLabel: selection.timeLabel });
              setSelection(null);
            }}
          />
        )}
      </BottomSheet>

      <AnimatePresence>
        {confirmed && (
          <BookingConfirmation
            booking={confirmed.booking}
            dateLabel={confirmed.dateLabel}
            timeLabel={confirmed.timeLabel}
            onClose={() => setConfirmed(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoadingState() {
  return (
    <motion.div role="status" aria-label="Loading availability" className="flex min-h-0 flex-1 flex-col gap-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex gap-2.5">
        {[0, 1, 2].map((index) => (
          <Shimmer key={index} className="h-[88px] flex-1 rounded-card-sm" />
        ))}
      </div>
      <Shimmer className="h-12 rounded-full" />
      <Shimmer className="min-h-0 flex-1 rounded-card" />
    </motion.div>
  );
}
