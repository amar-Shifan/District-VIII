/** Burgundy-tinted placeholder with a shimmer sweep, shown while live data loads. */
export function CardSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      className="relative flex h-full flex-col overflow-hidden rounded-card border border-white/10 bg-burgundy-dark/70 p-5 shadow-card"
    >
      <span aria-hidden className="bg-shimmer absolute inset-0 motion-safe:animate-shimmer" />
      <div aria-hidden className="relative flex items-start justify-between">
        <span className="h-3 w-24 rounded-full bg-white/10" />
        <span className="h-6 w-20 rounded-full bg-white/10" />
      </div>
      <div aria-hidden className="relative flex flex-1 flex-col justify-center gap-3">
        <span className="h-14 w-36 rounded-card-sm bg-white/10" />
        <span className="h-3 w-40 rounded-full bg-white/10" />
      </div>
      <span aria-hidden className="absolute right-4 bottom-4 size-12 rounded-full bg-white/10" />
    </div>
  );
}
