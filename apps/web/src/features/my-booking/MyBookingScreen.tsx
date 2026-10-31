"use client";

import { businessDateOf, formatPhone, normalizePhone, validatePhone } from "@district-viii/shared";
import { motion } from "framer-motion";
import { CalendarSearch, WifiOff } from "lucide-react";
import { type FormEvent, useState } from "react";
import { PillButton, PillLink } from "@/components/PillButton";
import { LiveIndicator, ScreenHeader } from "@/components/ScreenHeader";
import { Shimmer, StateMessage } from "@/components/StateMessage";
import { TextField } from "@/components/TextField";
import { useMyBookings, usePublicSettings } from "@/hooks/use-live-data";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useNow } from "@/hooks/use-now";
import { saveCustomerProfile, useCustomerProfile } from "@/lib/customer-profile";
import { BookingCard } from "./BookingCard";

export function MyBookingScreen() {
  useLiveUpdates();
  const profile = useCustomerProfile();
  const settings = usePublicSettings();
  const now = useNow(60_000);
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const activePhone = editing ? null : (lookupPhone ?? (profile?.phone || null));
  const bookings = useMyBookings(activePhone);
  const today = settings.data && now ? businessDateOf(now, settings.data) : null;

  const upcoming = (bookings.data ?? []).filter((booking) => !now || Date.parse(booking.endsAt) > now.getTime());
  const past = (bookings.data ?? []).filter((booking) => now && Date.parse(booking.endsAt) <= now.getTime());

  return (
    <div className="relative flex h-full flex-col bg-ink lg:h-auto lg:min-h-dvh">
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />
      <ScreenHeader
        title="My booking"
        subtitle={activePhone ? formatPhone(activePhone) : "Find your bookings by phone"}
        action={activePhone ? <LiveIndicator /> : undefined}
      />

      <main className="relative flex min-h-0 flex-1 flex-col px-4 pt-4 pb-[calc(var(--safe-bottom)+16px)] md:px-10 lg:mx-auto lg:w-full lg:max-w-[1440px] lg:px-14 lg:pt-8 lg:pb-12">
        {!activePhone ? (
          <PhoneLookup
            initialPhone={profile?.phone ?? ""}
            onSubmit={(phone) => {
              saveCustomerProfile({ name: profile?.name ?? "", phone });
              setLookupPhone(phone);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.22em] text-blush uppercase">Your bookings</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-white underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blush"
              >
                Change number
              </button>
            </div>

            {/* The only scrolling region on this screen. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2 lg:overflow-visible">
              {bookings.isPending ? (
                <div role="status" aria-label="Loading bookings" className="space-y-3">
                  {[0, 1, 2].map((index) => (
                    <Shimmer key={index} className="h-[116px] rounded-card-sm" />
                  ))}
                </div>
              ) : bookings.isError ? (
                <StateMessage
                  tone="error"
                  icon={WifiOff}
                  title="Couldn't load bookings"
                  description="Check your connection and try again."
                  action={
                    <PillButton variant="light" onClick={() => void bookings.refetch()}>
                      Try again
                    </PillButton>
                  }
                />
              ) : (bookings.data ?? []).length === 0 ? (
                <StateMessage
                  icon={CalendarSearch}
                  title="No bookings yet"
                  description={`We couldn't find bookings for ${formatPhone(activePhone)} in the last two weeks.`}
                  action={
                    <div className="flex gap-2">
                      <PillLink href="/pool" variant="light">
                        Book pool
                      </PillLink>
                      <PillLink href="/ps5" variant="ghost">
                        Book PS5
                      </PillLink>
                    </div>
                  }
                />
              ) : (
                <div className="space-y-5 lg:grid lg:grid-cols-[repeat(2,minmax(0,1fr))] lg:items-start lg:gap-6 lg:space-y-0">
                  {upcoming.length > 0 && (
                    <section aria-label="Upcoming bookings">
                      <ul className="space-y-3">
                        {upcoming.map((booking, index) => (
                          <BookingCard key={booking.id} booking={booking} phone={activePhone} today={today} canCancel index={index} />
                        ))}
                      </ul>
                    </section>
                  )}
                  {past.length > 0 && (
                    <section aria-labelledby="past-bookings">
                      <h2 id="past-bookings" className="mb-2 text-[11px] font-bold tracking-[0.22em] text-blush/80 uppercase">
                        Earlier
                      </h2>
                      <ul className="space-y-3 opacity-80">
                        {past.map((booking, index) => (
                          <BookingCard
                            key={booking.id}
                            booking={booking}
                            phone={activePhone}
                            today={today}
                            canCancel={false}
                            index={upcoming.length + index}
                          />
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PhoneLookup({ initialPhone, onSubmit }: { initialPhone: string; onSubmit: (phone: string) => void }) {
  const [phone, setPhone] = useState(initialPhone);
  const [submitted, setSubmitted] = useState(false);
  const error = submitted ? validatePhone(phone) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const normalized = normalizePhone(phone);
    if (normalized) onSubmit(normalized);
  };

  return (
    <motion.form
      noValidate
      onSubmit={submit}
      className="flex flex-1 flex-col justify-center gap-5 lg:my-auto lg:mx-auto lg:w-full lg:max-w-xl lg:flex-none lg:rounded-card lg:border lg:border-white/10 lg:bg-white/[0.03] lg:p-8"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.45 }}
    >
      <div className="text-center">
        <span className="bg-card-gradient mx-auto grid size-16 place-items-center rounded-full border border-white/10 shadow-card">
          <CalendarSearch aria-hidden strokeWidth={1.75} className="size-7 text-white" />
        </span>
        <h2 className="mt-4 -skew-x-8 font-display text-3xl text-white">Find your booking</h2>
        <p className="mt-1.5 text-sm text-blush">Enter the phone number you booked with.</p>
      </div>
      <TextField
        label="Phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        value={phone}
        maxLength={16}
        onChange={(event) => setPhone(event.target.value)}
        error={error}
        autoFocus
      />
      <PillButton type="submit" className="w-full">
        Show my bookings
      </PillButton>
    </motion.form>
  );
}
