"use client";

import { motion, type Variants } from "framer-motion";

const STAGGER_S = 0.06;
const LETTER_DURATION_S = 0.75;

const letterVariants: Variants = {
  hidden: { opacity: 0, y: "70%", filter: "blur(14px)" },
  visible: {
    opacity: 1,
    y: "0%",
    filter: "blur(0px)",
    transition: { duration: LETTER_DURATION_S, ease: [0.22, 1, 0.36, 1] },
  },
};

function toGlyphs(line: string): string[] {
  return Array.from(line, (char) => (char === " " ? " " : char));
}

interface AnimatedTitleProps {
  /** Visual lines, e.g. ["district", "VIII"]. */
  lines: readonly string[];
  /** Accessible text for the heading. */
  label: string;
  delay?: number;
  className?: string;
}

/** Returns the time (s) at which the entrance reveal finishes, for sequencing follow-up animations. */
export function getTitleEntranceEnd(lines: readonly string[], delay = 0.2): number {
  const glyphCount = lines.reduce((sum, line) => sum + Array.from(line).length, 0);
  return delay + (glyphCount - 1) * STAGGER_S + LETTER_DURATION_S;
}

/**
 * Brand title: letters stagger up from below with a blur-to-sharp reveal,
 * then a pulsing burgundy glow sits behind and a shine sweeps across.
 */
export function AnimatedTitle({ lines, label, delay = 0.2, className = "" }: AnimatedTitleProps) {
  const entranceEnd = getTitleEntranceEnd(lines, delay);

  return (
    <h1 className={`relative ${className}`}>
      <span className="sr-only">{label}</span>

      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: entranceEnd - 0.4, duration: 1.2 }}
      >
        <span className="bg-title-glow block size-full blur-2xl motion-safe:animate-glow-pulse" />
      </motion.span>

      <motion.span
        aria-hidden
        className="block -skew-x-8 font-display leading-[0.84]"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: STAGGER_S, delayChildren: delay }}
      >
        {lines.map((line) => (
          <span key={line} className="relative block whitespace-nowrap">
            {toGlyphs(line).map((glyph, index) => (
              <motion.span key={index} variants={letterVariants} className="text-glow inline-block text-blush">
                {glyph}
              </motion.span>
            ))}
            {/* Transparent copy carrying the moving highlight, layered exactly over the letters. */}
            <motion.span
              className="text-shine-overlay pointer-events-none absolute inset-0 motion-safe:animate-shine"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: entranceEnd, duration: 0.4 }}
            >
              {toGlyphs(line).map((glyph, index) => (
                <span key={index} className="inline-block">
                  {glyph}
                </span>
              ))}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </h1>
  );
}
