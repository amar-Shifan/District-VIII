import type { ReactNode } from "react";
import { formatIstClock, type UnitAvailabilitySummary } from "@district-viii/shared";
import { CountUp } from "./CountUp";
import { HomeCard } from "./HomeCard";
import { StatusPill } from "./StatusPill";

interface AvailabilityCardProps {
  href: string;
  label: string;
  /** Plural noun for the caption, e.g. "tables" or "consoles". */
  unitNoun: string;
  availability: UnitAvailabilitySummary;
  decoration: ReactNode;
}

export function AvailabilityCard({ href, label, unitNoun, availability, decoration }: AvailabilityCardProps) {
  const { free, total, nextFreeAt } = availability;
  const isFull = free === 0;
  const nextFree = nextFreeAt ? formatIstClock(nextFreeAt) : null;

  const caption = isFull ? (nextFree ? `Next free: ${nextFree}` : "All in use right now") : `${unitNoun} free right now`;
  const ariaLabel = `${label}: ${free} of ${total} ${unitNoun} free${isFull && nextFree ? `, next free at ${nextFree}` : ""}. Book now.`;

  return (
    <HomeCard
      href={href}
      ariaLabel={ariaLabel}
      label={label}
      badge={<StatusPill variant={isFull ? "full" : "available"} />}
      decoration={decoration}
    >
      <p className="flex -skew-x-8 items-baseline gap-2 font-display leading-none text-white">
        <CountUp value={free} className="text-[clamp(2.75rem,36cqh,6rem)]" />
        <span className="text-[clamp(1.5rem,18cqh,3rem)] text-white/60">/ {total}</span>
      </p>
      <p className="mt-2 text-sm font-medium text-blush">{caption}</p>
    </HomeCard>
  );
}
