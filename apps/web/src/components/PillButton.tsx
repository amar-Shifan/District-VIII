import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "light" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-burgundy text-white shadow-glow hover:bg-burgundy-bright disabled:bg-burgundy/50",
  light: "bg-white text-burgundy shadow-handle disabled:bg-white/60",
  ghost: "border border-white/20 text-white hover:border-blush/60",
};

const BASE =
  "inline-flex h-13 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold tracking-wide transition-[transform,background-color,border-color] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blush focus-visible:ring-offset-2 focus-visible:ring-offset-ink active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function PillButton({ variant = "primary", className = "", children, ...button }: PillButtonProps) {
  return (
    <button className={`${BASE} ${VARIANTS[variant]} ${className}`} {...button}>
      {children}
    </button>
  );
}

export function PillLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}
