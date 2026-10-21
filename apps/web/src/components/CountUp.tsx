"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

interface CountUpProps {
  value: number;
  /** Seconds. */
  duration?: number;
  className?: string;
}

/**
 * Counts from the previously shown value to `value` with GSAP. Writes to the
 * DOM directly so the tween never triggers React re-renders.
 */
export function CountUp({ value, duration = 1.2, className = "" }: CountUpProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const counter = useRef({ current: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const state = counter.current;
    const render = () => {
      element.textContent = String(Math.round(state.current));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      state.current = value;
      render();
      return;
    }

    const tween = gsap.to(state, { current: value, duration, ease: "power3.out", onUpdate: render });
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return (
    <span ref={elementRef} className={`tabular-nums ${className}`}>
      0
    </span>
  );
}
