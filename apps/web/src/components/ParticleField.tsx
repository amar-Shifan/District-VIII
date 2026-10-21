import type { CSSProperties } from "react";

interface Particle {
  id: number;
  kind: "dot" | "streak";
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

/** Small deterministic PRNG so server and client render identical particles. */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createParticles(count: number, seed: number): Particle[] {
  const random = mulberry32(seed);
  return Array.from({ length: count }, (_, id) => {
    const kind = random() < 0.35 ? "streak" : "dot";
    const duration = 10 + random() * 12;
    return {
      id,
      kind,
      left: random() * 100,
      size: kind === "streak" ? 40 + random() * 70 : 2 + random() * 4,
      duration,
      // Negative delays start each particle mid-flight, so the field is full on first paint.
      delay: -random() * duration,
      drift: (random() - 0.5) * 80,
      opacity: kind === "streak" ? 0.35 + random() * 0.35 : 0.5 + random() * 0.5,
    };
  });
}

interface ParticleFieldProps {
  count?: number;
  seed?: number;
  className?: string;
}

/**
 * Burgundy sparks and light streaks drifting upward. Pure CSS transforms and
 * opacity, no JS per frame. Hidden entirely for reduced-motion users.
 */
export function ParticleField({ count = 24, seed = 8, className = "" }: ParticleFieldProps) {
  const particles = createParticles(Math.min(count, 30), seed);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden ${className}`}>
      {particles.map((particle) => {
        const style = {
          left: `${particle.left}%`,
          animationDuration: `${particle.duration}s`,
          animationDelay: `${particle.delay}s`,
          "--particle-drift": `${particle.drift}px`,
          "--particle-opacity": particle.opacity,
          ...(particle.kind === "streak"
            ? { width: 2, height: particle.size }
            : { width: particle.size, height: particle.size }),
        } as CSSProperties;

        return (
          <span
            key={particle.id}
            style={style}
            className={`absolute top-full animate-float-up opacity-0 will-change-transform ${
              particle.kind === "streak"
                ? "rounded-full bg-linear-to-t from-transparent via-burgundy-bright to-blush/70"
                : "rounded-full bg-burgundy-bright shadow-glow"
            }`}
          />
        );
      })}
    </div>
  );
}
