"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface ScreenHeaderProps {
  title: string;
  /** Small caption under the title. */
  subtitle?: ReactNode;
  backHref?: string;
  /** Optional element on the right, e.g. a live indicator. */
  action?: ReactNode;
}

/** Floating pill header shared by the inner customer screens; same glass and glow as the Home header. */
export function ScreenHeader({ title, subtitle, backHref = "/home", action }: ScreenHeaderProps) {
  return (
    <motion.header
      className="relative z-10 mx-4 mt-[calc(var(--safe-top)+12px)] shrink-0 rounded-full"
      initial={{ y: -96, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.9 }}
    >
      <div className="relative flex items-center gap-3 rounded-full border border-burgundy/60 bg-ink/60 p-2 pr-5 shadow-glow backdrop-blur-xl">
        <Link
          href={backHref}
          aria-label="Back to home"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-burgundy transition-transform duration-200 outline-none hover:scale-105 focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-95"
        >
          <ArrowLeft aria-hidden strokeWidth={2.75} className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate -skew-x-8 font-display text-[24px] leading-none text-white">{title}</h1>
          {subtitle && <p className="mt-1 truncate text-[11px] font-semibold text-blush">{subtitle}</p>}
        </div>
        {action}
      </div>
      <span aria-hidden className="border-glow" />
    </motion.header>
  );
}

/** Pulsing "Live" chip for headers. */
export function LiveIndicator() {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] text-blush uppercase">
      <span aria-hidden className="relative flex size-1.5">
        <span className="absolute inset-0 rounded-full bg-burgundy-bright motion-safe:animate-ping-soft" />
        <span className="relative size-1.5 rounded-full bg-white motion-safe:animate-dot-pulse" />
      </span>
      Live
    </span>
  );
}
