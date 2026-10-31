"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LandingBackground } from "@/components/LandingBackground";
import { ParticleField } from "@/components/ParticleField";
import { SlideToOpen, type SlideOrigin } from "@/components/SlideToOpen";
import { markRevealPending } from "@/lib/transition";

const HOME_ROUTE = "/home";
const REVEAL_SIZE = 48;

interface Reveal {
  x: number;
  y: number;
  scale: number;
}

export function LandingScreen() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [reveal, setReveal] = useState<Reveal | null>(null);
  useEffect(() => {
    router.prefetch(HOME_ROUTE);
  }, [router]);

  const navigateHome = useCallback(() => {
    markRevealPending();
    router.push(HOME_ROUTE);
  }, [router]);

  const handleComplete = useCallback(
    (origin: SlideOrigin) => {
      const root = rootRef.current?.getBoundingClientRect();
      if (!root) {
        navigateHome();
        return;
      }
      const x = origin.x - root.left;
      const y = origin.y - root.top;
      // Scale the circle until it covers the farthest corner of the screen.
      const farthest = Math.max(
        Math.hypot(x, y),
        Math.hypot(root.width - x, y),
        Math.hypot(x, root.height - y),
        Math.hypot(root.width - x, root.height - y),
      );
      setReveal({ x, y, scale: (farthest * 2) / REVEAL_SIZE + 1 });
    },
    [navigateHome],
  );

  return (
    <div ref={rootRef} className="relative flex h-full flex-col overflow-hidden lg:h-dvh lg:min-h-[720px]">
      <LandingBackground />
      <ParticleField count={24} />

      <main className="@container relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-[var(--safe-top)] text-center lg:mx-auto lg:w-full lg:max-w-[1440px] lg:flex-row lg:gap-24 lg:px-16 lg:pt-10 lg:text-left">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="relative aspect-[7/5] w-[min(62vw,24rem)] overflow-hidden lg:w-[min(40vw,34rem)]">
            <Image
              src="/images/text-logo.png"
              alt="District VIII"
              fill
              priority
              sizes="(max-width: 1024px) 62vw, 40vw"
              className="scale-[1.35] object-cover"
            />
          </h1>
          <motion.p
            className="mt-8 pl-[0.55em] text-xs font-semibold tracking-[0.55em] text-blush uppercase"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.8, ease: "easeOut" }}
          >
            Billiard Club
          </motion.p>
        </div>
      </main>

      <motion.div
        className="relative z-10 px-6 pb-[calc(var(--safe-bottom)+28px)] lg:mx-auto lg:mb-10 lg:w-full lg:max-w-xl lg:px-0 lg:pb-0"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <SlideToOpen onComplete={handleComplete} />
      </motion.div>

      {reveal && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute z-50 rounded-full bg-burgundy"
          style={{
            width: REVEAL_SIZE,
            height: REVEAL_SIZE,
            left: reveal.x - REVEAL_SIZE / 2,
            top: reveal.y - REVEAL_SIZE / 2,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: reveal.scale }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.7, 0, 0.3, 1] }}
          onAnimationComplete={navigateHome}
        />
      )}
    </div>
  );
}
