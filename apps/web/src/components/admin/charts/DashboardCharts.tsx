"use client";

import {
  type BookingsPerDayPoint,
  type DailyEstimatedSalesDto,
  formatHour,
  formatShortDate,
  type PeakHourPoint,
  type StatusSplitPoint,
  UNIT_TYPE_LABELS,
  type UsageByTypePoint,
} from "@district-viii/shared";
import { useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useThemeColors } from "@/hooks/use-theme-colors";

/** Loaded with next/dynamic so Recharts only ships on the dashboard. */

interface TooltipEntry {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: ReactNode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-burgundy/15 bg-white px-3.5 py-2.5 text-xs text-wine-ink shadow-admin-lift">
      {label !== undefined && <p className="mb-1 font-bold">{label}</p>}
      {payload.map((entry) => (
        <p key={String(entry.name)} className="flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-wine-ink/60 capitalize">{entry.name}</span>
          <span className="ml-auto font-bold">{String(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

const AXIS = { fontSize: 11, fontWeight: 600 } as const;
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const SALES_DAY = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const SALES_DATE = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function SalesTooltip({ active, point }: { active?: boolean; point?: DailyEstimatedSalesDto }) {
  if (!active || !point) return null;
  const date = new Date(`${point.date}T00:00:00Z`);
  return (
    <div className="rounded-2xl border border-burgundy/15 bg-white px-3.5 py-2.5 text-xs text-wine-ink shadow-admin-lift">
      <p className="mb-1 font-bold">{SALES_DATE.format(date)}</p>
      <p className="font-semibold text-wine-ink/60">Approved bookings: {point.bookingCount}</p>
      {point.missingEstimateCount > 0 ? (
        <p className="mt-1 font-bold text-burgundy">Incomplete · {point.missingEstimateCount} missing estimate{point.missingEstimateCount === 1 ? "" : "s"}</p>
      ) : (
        <p className="mt-1 font-bold">Estimated value: {INR.format(point.estimatedBookingValue ?? 0)}</p>
      )}
    </div>
  );
}

export function EstimatedSalesBarChart({ data }: { data: DailyEstimatedSalesDto[] }) {
  const colors = useThemeColors();
  const animate = !useReducedMotion();
  const rows = data.map((point) => ({
    ...point,
    label: SALES_DAY.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.missingEstimateCount > 0 ? null : point.estimatedBookingValue,
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="estimatedSalesBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.burgundyBright} />
            <stop offset="100%" stopColor={colors.burgundyDark} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.burgundy} strokeOpacity={0.08} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ ...AXIS, fill: colors.wineInk, fillOpacity: 0.55 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={76}
          tickFormatter={(value: number) => INR.format(value)}
          tick={{ ...AXIS, fontSize: 10, fill: colors.wineInk, fillOpacity: 0.45 }}
        />
        <Tooltip
          content={(props) => {
            const point = props.payload?.[0]?.payload as DailyEstimatedSalesDto | undefined;
            return <SalesTooltip active={props.active} point={point} />;
          }}
          cursor={{ fill: colors.burgundy, fillOpacity: 0.06 }}
        />
        <Bar dataKey="value" name="estimated sales" fill="url(#estimatedSalesBar)" radius={[8, 8, 0, 0]} maxBarSize={40} isAnimationActive={animate} animationDuration={850} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BookingsPerDayChart({ data }: { data: BookingsPerDayPoint[] }) {
  const colors = useThemeColors();
  const animate = !useReducedMotion();
  const rows = data.map((point) => ({ ...point, label: formatShortDate(point.date).split(" ").slice(0, 2).join(" ") }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="perDayTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.burgundy} stopOpacity={0.45} />
            <stop offset="100%" stopColor={colors.burgundy} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="perDayApproved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.burgundyBright} stopOpacity={0.25} />
            <stop offset="100%" stopColor={colors.burgundyBright} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.burgundy} strokeOpacity={0.08} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ ...AXIS, fill: colors.wineInk, fillOpacity: 0.55 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fill: colors.wineInk, fillOpacity: 0.45 }} />
        <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ stroke: colors.burgundy, strokeOpacity: 0.2 }} />
        <Area
          type="monotone"
          dataKey="total"
          name="all requests"
          stroke={colors.burgundy}
          strokeWidth={2.5}
          fill="url(#perDayTotal)"
          isAnimationActive={animate}
          animationDuration={900}
        />
        <Area
          type="monotone"
          dataKey="approved"
          name="approved"
          stroke={colors.burgundyBright}
          strokeWidth={2}
          strokeDasharray="5 4"
          fill="url(#perDayApproved)"
          isAnimationActive={animate}
          animationDuration={1100}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PeakHoursChart({ data }: { data: PeakHourPoint[] }) {
  const colors = useThemeColors();
  const animate = !useReducedMotion();
  const max = Math.max(1, ...data.map((point) => point.count));
  const rows = data.map((point) => ({ ...point, label: formatHour(point.hour).replace(" ", "") }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="peakBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.burgundyBright} />
            <stop offset="100%" stopColor={colors.burgundyDark} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={colors.burgundy} strokeOpacity={0.08} />
        <XAxis dataKey="label" interval={1} tickLine={false} axisLine={false} tick={{ ...AXIS, fontSize: 10, fill: colors.wineInk, fillOpacity: 0.55 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ ...AXIS, fill: colors.wineInk, fillOpacity: 0.45 }} />
        <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ fill: colors.burgundy, fillOpacity: 0.06 }} />
        <Bar dataKey="count" name="bookings" radius={[8, 8, 8, 8]} maxBarSize={22} isAnimationActive={animate} animationDuration={900}>
          {rows.map((row) => (
            <Cell key={row.hour} fill="url(#peakBar)" fillOpacity={0.35 + 0.65 * (row.count / max)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function UsageDonut({ data }: { data: UsageByTypePoint[] }) {
  const colors = useThemeColors();
  const animate = !useReducedMotion();
  const total = data.reduce((sum, point) => sum + point.count, 0);
  const rows = data.map((point) => ({ name: UNIT_TYPE_LABELS[point.type], value: point.count, type: point.type }));
  const fills = { pool: colors.burgundy, ps5: colors.blush };
  return (
    <div className="relative size-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={(props) => <ChartTooltip {...props} />} />
          <Pie
            data={total > 0 ? rows : [{ name: "No bookings", value: 1, type: "pool" as const }]}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={total > 0 ? 3 : 0}
            cornerRadius={8}
            stroke="none"
            isAnimationActive={animate}
            animationDuration={900}
          >
            {(total > 0 ? rows : [{ type: "pool" as const }]).map((row, index) => (
              <Cell key={index} fill={total > 0 ? fills[row.type] : colors.blush} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="-skew-x-8 font-display text-3xl leading-none text-wine-ink">{total}</p>
          <p className="text-[10px] font-bold tracking-widest text-wine-ink/50 uppercase">hours</p>
        </div>
      </div>
    </div>
  );
}

export function StatusSplitChart({ data }: { data: StatusSplitPoint[] }) {
  const colors = useThemeColors();
  const animate = !useReducedMotion();
  const fills = {
    pending: colors.burgundyBright,
    approved: colors.burgundy,
    rejected: colors.blush,
    cancelled: colors.wineInk,
  };
  const rows = data.map((point) => ({ ...point, label: point.status[0]?.toUpperCase() + point.status.slice(1) }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={78}
          tickLine={false}
          axisLine={false}
          tick={{ ...AXIS, fill: colors.wineInk, fillOpacity: 0.65 }}
        />
        <Tooltip content={(props) => <ChartTooltip {...props} />} cursor={{ fill: colors.burgundy, fillOpacity: 0.05 }} />
        <Bar dataKey="count" name="bookings" radius={[0, 10, 10, 0]} barSize={18} isAnimationActive={animate} animationDuration={900}>
          {rows.map((row) => (
            <Cell key={row.status} fill={fills[row.status]} fillOpacity={row.status === "cancelled" ? 0.25 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
