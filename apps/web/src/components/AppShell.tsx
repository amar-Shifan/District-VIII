import type { ReactNode } from "react";

/**
 * Phone-style container for the customer app: full screen on mobile, a
 * centered 430px column with a burgundy glow on larger screens. The
 * data-scroll-lock attribute turns off page scrolling (see globals.css).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div data-scroll-lock className="relative flex h-dvh w-full justify-center overflow-hidden bg-ink">
      <div aria-hidden className="bg-shell-glow pointer-events-none absolute inset-0 hidden sm:block" />
      <div className="relative isolate h-full w-full max-w-[430px] overflow-hidden bg-ink sm:shadow-shell">
        {children}
      </div>
    </div>
  );
}
