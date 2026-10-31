import type { ReactNode } from "react";

/**
 * Customer application frame. It keeps the approved phone layout on small
 * screens and gives tablet and desktop pages room to use their own layouts.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div data-scroll-lock className="relative flex h-dvh w-full justify-center overflow-hidden bg-ink lg:overflow-y-auto lg:overflow-x-hidden">
      <div aria-hidden className="bg-shell-glow pointer-events-none absolute inset-0 hidden sm:block" />
      <div className="relative isolate h-full w-full max-w-[430px] overflow-hidden bg-ink sm:max-w-[640px] sm:shadow-shell md:max-w-[900px] lg:h-auto lg:min-h-dvh lg:max-w-none lg:overflow-visible lg:bg-transparent lg:shadow-none">
        {children}
      </div>
    </div>
  );
}
