"use client";

import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

const HANDLE_SIZE = 56;
const TRACK_INSET = 6;
const COMPLETE_THRESHOLD = 0.85;
const KEYBOARD_STEP = 0.25;
const SPRING = { type: "spring", stiffness: 520, damping: 38 } as const;
/** Short tween for the completion snap, so the exit reveal starts without waiting for a spring to settle. */
const SNAP = { duration: 0.22, ease: [0.22, 1, 0.36, 1] } as const;

export interface SlideOrigin {
  /** Handle center in viewport coordinates, used as the origin of the exit reveal. */
  x: number;
  y: number;
}

interface SlideToOpenProps {
  onComplete: (origin: SlideOrigin) => void;
  label?: string;
  ariaLabel?: string;
}

export function SlideToOpen({
  onComplete,
  label = "Slide to open",
  ariaLabel = "Slide to open District VIII",
}: SlideToOpenProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const [maxX, setMaxX] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const x = useMotionValue(0);
  const max = useMotionValue(0);
  const ratio = useTransform([x, max], ([value, limit]: number[]) => (limit > 0 ? Math.min(value / limit, 1) : 0));
  const labelOpacity = useTransform(ratio, [0, 0.5], [1, 0]);
  const fillOpacity = useTransform(ratio, [0, 0.15], [0, 1]);
  const fillX = useTransform([x, max], ([value, limit]: number[]) => value - limit);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(entry.contentRect.width - HANDLE_SIZE - TRACK_INSET * 2, 0);
      setMaxX(next);
      max.set(next);
      if (completedRef.current) x.set(next);
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, [max, x]);

  // Mirror drag progress to aria-valuenow in 10% steps, to avoid re-rendering every frame.
  useMotionValueEvent(ratio, "change", (value) => {
    const stepped = Math.round(value * 10) * 10;
    setProgress((current) => (current === stepped ? current : stepped));
  });

  const complete = useCallback(() => {
    if (completedRef.current || maxX === 0) return;
    completedRef.current = true;
    setCompleted(true);
    animate(x, maxX, reduceMotion ? { duration: 0 } : SNAP).then(() => {
      const rect = handleRef.current?.getBoundingClientRect();
      onComplete(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 0, y: 0 });
    });
  }, [maxX, onComplete, reduceMotion, x]);

  const springBack = useCallback(() => {
    animate(x, 0, reduceMotion ? { duration: 0 } : SPRING);
  }, [reduceMotion, x]);

  const handleDragEnd = () => {
    if (x.get() >= maxX * COMPLETE_THRESHOLD) complete();
    else springBack();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (completedRef.current) return;
    switch (event.key) {
      case "Enter":
      case " ":
      case "End":
        event.preventDefault();
        complete();
        break;
      case "ArrowRight":
      case "ArrowUp": {
        event.preventDefault();
        const next = Math.min(x.get() + maxX * KEYBOARD_STEP, maxX);
        if (next >= maxX * COMPLETE_THRESHOLD) complete();
        else animate(x, next, SPRING);
        break;
      }
      case "ArrowLeft":
      case "ArrowDown":
      case "Home":
        event.preventDefault();
        springBack();
        break;
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative h-[68px] w-full overflow-hidden rounded-full border border-burgundy-bright/70 bg-white/8 shadow-glow backdrop-blur-md"
    >
      {/* Progress fill trailing the handle. */}
      <motion.span
        aria-hidden
        className="bg-reveal-fill absolute inset-y-0 left-0 rounded-full"
        style={{ x: fillX, opacity: fillOpacity, width: maxX + HANDLE_SIZE + TRACK_INSET * 2 }}
      />

      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-between pr-6 pl-[calc(56px+28px)]"
        style={{ opacity: labelOpacity }}
      >
        <span className="text-sm font-semibold tracking-[0.28em] text-white uppercase">{label}</span>
        <span className="flex items-center text-blush">
          {[0, 1, 2].map((index) => (
            <ChevronRight
              key={index}
              aria-hidden
              strokeWidth={2.5}
              className="-ml-2 size-5 motion-safe:animate-chevron"
              style={{ animationDelay: `${index * 0.18}s` }}
            />
          ))}
        </span>
      </motion.span>

      <motion.div
        ref={handleRef}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={completed ? 100 : progress}
        aria-valuetext={completed ? "Opening" : `${progress}%, press Enter to open`}
        aria-orientation="horizontal"
        drag={completed ? false : "x"}
        dragConstraints={{ left: 0, right: maxX }}
        dragElastic={0.04}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onKeyDown={handleKeyDown}
        style={{ x, width: HANDLE_SIZE, height: HANDLE_SIZE, top: TRACK_INSET, left: TRACK_INSET }}
        whileTap={{ scale: 0.94 }}
        className="absolute grid cursor-grab touch-none place-items-center rounded-full bg-white text-burgundy shadow-handle outline-none select-none focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-2 focus-visible:ring-offset-burgundy-dark active:cursor-grabbing"
      >
        <ArrowRight aria-hidden strokeWidth={2.75} className="size-6" />
      </motion.div>
    </div>
  );
}
