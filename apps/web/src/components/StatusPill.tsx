export type StatusPillVariant = "available" | "full" | "busy" | "booked" | "maintenance";

const LABELS: Record<StatusPillVariant, string> = {
  available: "Available",
  full: "Full",
  busy: "Busy",
  booked: "Booked",
  maintenance: "Maintenance",
};

const STYLES: Record<StatusPillVariant, string> = {
  available: "bg-white text-burgundy",
  full: "bg-ink text-white",
  busy: "bg-burgundy-bright text-white",
  booked: "bg-ink text-white",
  maintenance: "border border-white/20 bg-ink/60 text-blush",
};

interface StatusPillProps {
  variant: StatusPillVariant;
  /** Overrides the default label, e.g. "Busy · 12:04". */
  label?: string;
  /** "sm" fits narrow cards such as the unit picker. */
  size?: "md" | "sm";
}

export function StatusPill({ variant, label, size = "md" }: StatusPillProps) {
  const pulsing = variant === "available" || variant === "busy";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full font-bold whitespace-nowrap uppercase tabular-nums ${
        size === "sm" ? "gap-1 px-2 py-0.5 text-[9.5px] tracking-[0.06em]" : "gap-1.5 px-3 py-1 text-[11px] tracking-[0.12em]"
      } ${STYLES[variant]}`}
    >
      {pulsing && (
        <span aria-hidden className="relative flex size-2">
          <span
            className={`absolute inset-0 rounded-full motion-safe:animate-ping-soft ${variant === "available" ? "bg-burgundy-bright" : "bg-white"}`}
          />
          <span
            className={`relative size-2 rounded-full motion-safe:animate-dot-pulse ${variant === "available" ? "bg-burgundy-bright" : "bg-white"}`}
          />
        </span>
      )}
      {label ?? LABELS[variant]}
    </span>
  );
}
