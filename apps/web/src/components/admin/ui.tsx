"use client";

import type { BookingStatus } from "@district-viii/shared";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";

// ---------- Layout ----------

export function AdminCard({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-card-sm border border-burgundy/10 bg-white p-5 shadow-admin ${className}`}>{children}</section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="-skew-x-8 font-display text-4xl leading-none text-wine-ink sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-wine-ink/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="bg-sidebar grid size-14 place-items-center rounded-full text-white shadow-admin-lift">
        <Icon aria-hidden strokeWidth={1.75} className="size-6" />
      </span>
      <p className="mt-4 font-bold text-wine-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-wine-ink/60">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`relative block overflow-hidden rounded-2xl bg-burgundy/8 ${className}`}>
      <span className="bg-admin-shimmer absolute inset-0 motion-safe:animate-shimmer" />
    </span>
  );
}

// ---------- Buttons ----------

type ButtonVariant = "primary" | "outline" | "ghost" | "light";
type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-sidebar text-white shadow-admin-lift hover:brightness-110 disabled:opacity-50",
  outline: "border border-burgundy/40 text-burgundy hover:border-burgundy hover:bg-burgundy/5 disabled:opacity-40",
  ghost: "text-wine-ink/70 hover:bg-burgundy/8 hover:text-wine-ink disabled:opacity-40",
  light: "bg-white text-burgundy shadow-admin hover:shadow-admin-lift disabled:opacity-50",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
};

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
}

export function AdminButton({ variant = "primary", size = "md", icon: Icon, className = "", children, ...button }: AdminButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition-[transform,filter,background-color,border-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 active:scale-[0.96] disabled:cursor-not-allowed disabled:active:scale-100 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...button}
    >
      {Icon && <Icon aria-hidden strokeWidth={2.25} className={size === "sm" ? "size-3.5" : "size-4"} />}
      {children}
    </button>
  );
}

// ---------- Status ----------

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "border border-burgundy text-burgundy",
  approved: "bg-burgundy text-white",
  rejected: "bg-wine-ink/12 text-wine-ink/75",
  cancelled: "bg-wine-ink/5 text-wine-ink/50",
};

export function AdminStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${STATUS_STYLES[status]}`}>
      {status === "pending" && (
        <span aria-hidden className="relative flex size-1.5">
          <span className="absolute inset-0 rounded-full bg-burgundy-bright motion-safe:animate-ping-soft" />
          <span className="relative size-1.5 rounded-full bg-burgundy-bright" />
        </span>
      )}
      {status}
    </span>
  );
}

// ---------- Form fields ----------

const FIELD =
  "w-full rounded-2xl border border-burgundy/15 bg-white px-3.5 text-sm text-wine-ink transition-colors outline-none placeholder:text-wine-ink/35 focus:border-burgundy focus:ring-2 focus:ring-burgundy/20 aria-[invalid=true]:border-burgundy-bright";

function FieldShell({ id, label, error, hint, children }: { id: string; label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-wine-ink/70">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p id={`${id}-msg`} role={error ? "alert" : undefined} className={`mt-1 text-xs ${error ? "font-semibold text-burgundy-bright" : "text-wine-ink/50"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type WithLabel = { label: string; error?: string | null; hint?: string };

export function Field({ label, error, hint, className = "", ...input }: WithLabel & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${FIELD} h-11 ${className}`}
        {...input}
      />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, className = "", children, ...select }: WithLabel & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select id={id} aria-invalid={error ? true : undefined} className={`${FIELD} h-11 pr-8 ${className}`} {...select}>
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, className = "", ...area }: WithLabel & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea id={id} aria-invalid={error ? true : undefined} className={`${FIELD} min-h-24 py-2.5 ${className}`} {...area} />
    </FieldShell>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-burgundy" : "bg-wine-ink/15"
      }`}
    >
      <motion.span
        aria-hidden
        className="absolute left-0.5 size-5 rounded-full bg-white shadow-admin"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 34 }}
      />
    </button>
  );
}

/** Segmented control for a handful of options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  layoutId,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  layoutId: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-burgundy/12 bg-white p-1 shadow-admin [scrollbar-width:none]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`relative h-8 shrink-0 rounded-full px-3.5 text-xs font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-burgundy ${
              active ? "text-white" : "text-wine-ink/60 hover:text-wine-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                aria-hidden
                className="bg-sidebar absolute inset-0 rounded-full"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
