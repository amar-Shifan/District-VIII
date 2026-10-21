"use client";

import { motion } from "framer-motion";
import { Gamepad2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AvailabilityCard } from "@/components/AvailabilityCard";
import { CardSkeleton } from "@/components/CardSkeleton";
import { FoodCard } from "@/components/FoodCard";
import { HomeHeader } from "@/components/HomeHeader";
import { EightBallIcon } from "@/components/icons/EightBallIcon";
import { useMyBookingStatus, useUnitsSummary } from "@/hooks/use-live-data";
import { clearRevealPending, isRevealPending } from "@/lib/transition";
import type { UnitAvailability } from "@/lib/types";

const CARD_DELAY_S = 0.25;
const CARD_STAGGER_S = 0.09;

function CardSlot({ index, children }: { index: number; children: ReactNode }) {
  return (
    <motion.div
      className="min-h-0"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: CARD_DELAY_S + index * CARD_STAGGER_S, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function LiveCard({ availability, isError, skeletonLabel, render }: {
  availability: UnitAvailability | undefined;
  isError: boolean;
  skeletonLabel: string;
  render: (availability: UnitAvailability) => ReactNode;
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
  const booking = useMyBookingStatus();
  // Read once on mount: true only right after the landing slide-to-open reveal.
  const [fadeFromReveal] = useState(isRevealPending);

  useEffect(() => {
    clearRevealPending();
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-ink">
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />

      <HomeHeader hasPendingBooking={booking.data?.hasPending ?? false} />

      <main className="relative grid min-h-0 flex-1 grid-rows-3 gap-3 px-4 pt-3 pb-[calc(var(--safe-bottom)+16px)]">
        <h1 className="sr-only">District VIII: live availability</h1>

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
                decoration={<EightBallIcon strokeWidth={1.1} className="size-full" />}
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
                decoration={<Gamepad2 strokeWidth={1.1} className="size-full" />}
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
