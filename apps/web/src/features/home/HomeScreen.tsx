"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { AvailabilityCard } from "@/components/AvailabilityCard";
import { CardSkeleton } from "@/components/CardSkeleton";
import { FoodCard } from "@/components/FoodCard";
import { HomeHeader } from "@/components/HomeHeader";
import { useMyBookingStatus, usePublicSettings, useUnitsSummary } from "@/hooks/use-live-data";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useCustomerProfile } from "@/lib/customer-profile";
import { clearRevealPending, isRevealPending } from "@/lib/transition";
import type { UnitAvailabilitySummary } from "@district-viii/shared";

const CARD_DELAY_S = 0.25;
const CARD_STAGGER_S = 0.09;

function CardSlot({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.div
      className="min-h-0 min-w-0"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: CARD_DELAY_S + index * CARD_STAGGER_S, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function LiveCard({ availability, isError, skeletonLabel, render }: {
  availability: UnitAvailabilitySummary | undefined;
  isError: boolean;
  skeletonLabel: string;
  render: (availability: UnitAvailabilitySummary) => ReactNode;
}) {
  if (availability) return render(availability);
  if (isError) {
    return (
      <div role="alert" className="grid h-full place-items-center rounded-card border border-white/10 bg-burgundy-dark/70 p-5 text-center text-sm text-blush">
        Live {skeletonLabel} is unavailable. Retrying…
      </div>
    );
  }
  return <CardSkeleton label={skeletonLabel} />;
}

export function HomeScreen() {
  const units = useUnitsSummary();
  const profile = useCustomerProfile();
  const booking = useMyBookingStatus(profile?.phone ?? null);
  const settings = usePublicSettings();
  useLiveUpdates();
  // Read once on mount: true only right after the landing slide-to-open reveal.
  const [fadeFromReveal] = useState(isRevealPending);

  useEffect(() => {
    clearRevealPending();
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-ink lg:h-auto lg:min-h-dvh">
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />

      <HomeHeader hasPendingBooking={booking.data?.hasPending ?? false} closeHour={settings.data?.closeHour} />

      <main className="relative grid min-h-0 flex-1 grid-rows-3 gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+16px)] md:mx-auto md:w-full md:max-w-[900px] md:grid-cols-[repeat(2,minmax(0,1fr))] md:grid-rows-2 md:gap-5 md:px-10 md:pt-6 lg:max-w-[1440px] lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-rows-[auto_minmax(300px,420px)] lg:content-center lg:items-stretch lg:gap-6 lg:px-14 lg:pt-10 lg:pb-12">
        <h1 className="sr-only">District VIII: live availability</h1>

        <div className="hidden lg:col-span-3 lg:block">
          <p className="text-xs font-bold tracking-[0.28em] text-blush/80 uppercase">Welcome to District VIII</p>
          <h2 className="mt-2 -skew-x-8 font-display text-4xl leading-none text-white">Pick your next game</h2>
        </div>

        <CardSlot index={0}>
          <LiveCard
            availability={units.data?.pool}
            isError={units.isError}
            skeletonLabel="pool availability"
            render={(pool) => (
              <AvailabilityCard
                href="/pool"
                label="8 Ball Pool"
                unitNoun="tables"
                availability={pool}
                imageSrc="/images/pool.jpeg"
              />
            )}
          />
        </CardSlot>

        <CardSlot index={1}>
          <LiveCard
            availability={units.data?.ps5}
            isError={units.isError}
            skeletonLabel="PS5 availability"
            render={(ps5) => (
              <AvailabilityCard
                href="/ps5"
                label="PS5 Stations"
                unitNoun="consoles"
                availability={ps5}
                imageSrc="/images/ps5.jpeg"
              />
            )}
          />
        </CardSlot>

        <CardSlot index={2}>
          <FoodCard href="/food" />
        </CardSlot>
      </main>

      {fadeFromReveal && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-50 bg-burgundy"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
    </div>
  );
}
