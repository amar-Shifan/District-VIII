import type { SVGProps } from "react";

/** Outline eight-ball, drawn to match lucide's stroke style. */
export function EightBallIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="11.5" r="4.75" />
      <circle cx="12" cy="9.9" r="1.35" />
      <circle cx="12" cy="13.1" r="1.6" />
    </svg>
  );
}
