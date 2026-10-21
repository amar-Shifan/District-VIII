export type StatusPillVariant = "available" | "full";

const LABELS: Record<StatusPillVariant, string> = {
  available: "Available",
  full: "Full",
};

export function StatusPill({ variant }: { variant: StatusPillVariant }) {
  const available = variant === "available";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase ${
        available ? "bg-white text-burgundy" : "bg-ink text-white"
      }`}
    >
      {available && (
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-burgundy-bright motion-safe:animate-ping-soft" />
          <span className="relative size-2 rounded-full bg-burgundy-bright motion-safe:animate-dot-pulse" />
        </span>
      )}
      {LABELS[variant]}
    </span>
  );
}
