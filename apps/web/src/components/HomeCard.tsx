import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface HomeCardProps {
  href: string;
  /** Full accessible name, since the visible text is split across several elements. */
  ariaLabel: string;
  label: string;
  badge?: ReactNode;
  /** Oversized background icon shown at low opacity on the right. */
  decoration: ReactNode;
  children: ReactNode;
}

/** Shared burgundy card frame used by every tile on the Home screen. */
export function HomeCard({ href, ariaLabel, label, badge, decoration, children }: HomeCardProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="group bg-card-gradient relative flex h-full flex-col overflow-hidden rounded-card border border-white/10 p-5 shadow-card transition-[translate,scale,box-shadow] duration-200 ease-out [container-type:size] outline-none select-none hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.98]"
    >
      <span aria-hidden className="bg-noise pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-[9%] aspect-square h-[78%] -translate-y-1/2 text-white opacity-[0.12]"
      >
        {decoration}
      </span>

      <div className="relative flex items-start justify-between gap-3">
        <span className="pt-1 text-[11px] font-bold tracking-[0.24em] text-blush uppercase">{label}</span>
        {badge}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col justify-center pr-16">{children}</div>

      <span
        aria-hidden
        className="absolute right-4 bottom-4 grid size-12 place-items-center rounded-full bg-white text-burgundy shadow-handle transition-transform duration-200 group-hover:translate-x-0.5"
      >
        <ArrowRight strokeWidth={2.75} className="size-5" />
      </span>
    </Link>
  );
}
