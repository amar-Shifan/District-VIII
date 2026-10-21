import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StateMessageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "empty" | "error";
}

/** Empty and error states for customer screens. */
export function StateMessage({ icon: Icon, title, description, action, tone = "empty" }: StateMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex flex-col items-center justify-center px-6 py-10 text-center motion-safe:animate-fade-up"
    >
      <span className="bg-card-gradient grid size-16 place-items-center rounded-full border border-white/10 text-white shadow-card">
        <Icon aria-hidden strokeWidth={1.75} className="size-7" />
      </span>
      <p className="mt-4 -skew-x-8 font-display text-2xl text-white">{title}</p>
      {description && <p className="mt-1.5 max-w-64 text-sm text-blush">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Shimmering burgundy placeholder block. */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden bg-burgundy-dark/70 ${className}`}>
      <span className="bg-shimmer absolute inset-0 motion-safe:animate-shimmer" />
    </span>
  );
}
