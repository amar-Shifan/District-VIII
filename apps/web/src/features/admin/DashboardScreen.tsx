"use client";

import {
  type BookingDto,
  formatBusinessDate,
  formatPhone,
  formatSlotRange,
  type IsoDate,
} from "@district-viii/shared";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CalendarCheck2, CheckCheck, Hourglass, Inbox, IndianRupee, type LucideIcon, MonitorPlay } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { AdminButton, AdminCard, EmptyState, Skeleton } from "@/components/admin/ui";
import { CountUp } from "@/components/CountUp";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { RejectDialog, useBookingActions } from "./booking-actions";
import { useAdminToday } from "./use-admin-today";

const chartLoading = () => <Skeleton className="size-full" />;
const BookingsPerDayChart = dynamic(() => import("@/components/admin/charts/DashboardCharts").then((m) => m.BookingsPerDayChart), { ssr: false, loading: chartLoading });
const EstimatedSalesBarChart = dynamic(() => import("@/components/admin/charts/DashboardCharts").then((m) => m.EstimatedSalesBarChart), { ssr: false, loading: chartLoading });
const PeakHoursChart = dynamic(() => import("@/components/admin/charts/DashboardCharts").then((m) => m.PeakHoursChart), { ssr: false, loading: chartLoading });
const UsageDonut = dynamic(() => import("@/components/admin/charts/DashboardCharts").then((m) => m.UsageDonut), { ssr: false, loading: chartLoading });
const StatusSplitChart = dynamic(() => import("@/components/admin/charts/DashboardCharts").then((m) => m.StatusSplitChart), { ssr: false, loading: chartLoading });

const IST_DATE = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" });
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function DashboardScreen() {
  const me = useQuery({ queryKey: adminKeys.me, queryFn: adminApi.me, staleTime: Infinity });
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: adminApi.stats, refetchInterval: 60_000 });
  const { today, now } = useAdminToday();

  const charts = {
    perDay: useQuery({ queryKey: [...adminKeys.charts, "per-day"], queryFn: () => adminApi.bookingsPerDay(7) }),
    peak: useQuery({ queryKey: [...adminKeys.charts, "peak"], queryFn: () => adminApi.peakHours(30) }),
    usage: useQuery({ queryKey: [...adminKeys.charts, "usage"], queryFn: () => adminApi.usageByType(30) }),
    split: useQuery({ queryKey: [...adminKeys.charts, "split"], queryFn: () => adminApi.statusSplit(30) }),
    sales: useQuery({
      queryKey: [...adminKeys.charts, "estimated-sales"],
      queryFn: adminApi.estimatedSalesLastSevenDays,
      refetchInterval: 60_000,
    }),
  };

  const statCards: { label: string; value: number | null | undefined; icon: LucideIcon; suffix?: string; href: string; currency?: boolean }[] = [
    { label: "Today's bookings", value: stats.data?.todayBookings, icon: CalendarCheck2, href: "/admin/bookings" },
    { label: "Pending approvals", value: stats.data?.pendingCount, icon: Hourglass, href: "/admin/bookings?status=pending" },
    { label: "Approved today", value: stats.data?.approvedToday, icon: CheckCheck, href: "/admin/bookings?status=approved" },
    {
      label: "Today's estimated value",
      value: stats.data?.estimatedBookingValueToday,
      icon: IndianRupee,
      href: "/admin/bookings?status=approved",
      currency: true,
    },
    {
      label: "Units in use now",
      value: stats.data?.unitsInUse,
      icon: MonitorPlay,
      suffix: stats.data ? `/ ${stats.data.totalUnits}` : undefined,
      href: "/admin/units",
    },
  ];

  return (
    <div>
      <header className="mb-8">
        <p className="text-sm font-semibold text-wine-ink/50">{now ? IST_DATE.format(now) : " "}</p>
        <h1 className="mt-1 -skew-x-8 font-display text-4xl leading-none text-wine-ink sm:text-5xl">
          Welcome back{me.data ? `, ${me.data.name}` : ""}
        </h1>
        <div aria-hidden className="mt-4 h-1 w-48 overflow-hidden rounded-full bg-burgundy/10">
          <span className="bg-accent-line block h-full w-1/2 motion-safe:animate-accent-slide" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              href={card.href}
              className="group flex items-center gap-4 rounded-card-sm border border-burgundy/10 bg-white p-5 shadow-admin transition-[translate,box-shadow] duration-200 outline-none hover:-translate-y-1 hover:shadow-admin-lift focus-visible:ring-2 focus-visible:ring-burgundy"
            >
              <span className="bg-sidebar grid size-12 shrink-0 place-items-center rounded-full text-white shadow-admin-lift">
                <card.icon aria-hidden strokeWidth={2} className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-wine-ink/55">{card.label}</span>
                <span className="mt-0.5 flex items-baseline gap-1.5 -skew-x-8 font-display text-4xl leading-none text-wine-ink">
                  {card.value === undefined ? (
                    <Skeleton className="h-9 w-12" />
                  ) : card.value === null ? (
                    <span className="font-sans text-base font-bold">Incomplete</span>
                  ) : card.currency ? (
                    INR.format(card.value)
                  ) : (
                    <CountUp value={card.value} />
                  )}
                  {card.suffix && <span className="text-xl text-wine-ink/40">{card.suffix}</span>}
                </span>
                {card.value === null && (
                  <span className="mt-1 block text-xs font-semibold text-wine-ink/50">
                    {stats.data?.unpricedApprovedToday ?? 0} approved booking{stats.data?.unpricedApprovedToday === 1 ? " has" : "s have"} no saved estimate.
                  </span>
                )}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Bookings per day" subtitle="Last 7 business days" className="xl:col-span-2" delay={0.2}>
          {charts.perDay.data ? <BookingsPerDayChart data={charts.perDay.data} /> : <Skeleton className="size-full" />}
        </ChartCard>
        <ChartCard title="Pool vs PS5" subtitle="Approved hours, last 30 days" delay={0.27}>
          {charts.usage.data ? <UsageDonut data={charts.usage.data} /> : <Skeleton className="size-full" />}
          {charts.usage.data && (
            <ul className="absolute bottom-4 left-5 flex gap-4 text-xs font-semibold text-wine-ink/70">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-burgundy" /> 8 Ball Pool
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-full bg-blush" /> PS5
              </li>
            </ul>
          )}
        </ChartCard>
        <ChartCard title="Peak hours" subtitle="Requests by start time, last 30 days" className="xl:col-span-2" delay={0.34}>
          {charts.peak.data ? <PeakHoursChart data={charts.peak.data} /> : <Skeleton className="size-full" />}
        </ChartCard>
        <ChartCard title="Status split" subtitle="All bookings, last 30 days" delay={0.41}>
          {charts.split.data ? <StatusSplitChart data={charts.split.data} /> : <Skeleton className="size-full" />}
        </ChartCard>
        <ChartCard title="Last 7 Days — Estimated Sales" subtitle="Estimated Booking Value (₹) · approved bookings only" className="xl:col-span-3" delay={0.48}>
          {charts.sales.isPending ? (
            <Skeleton className="size-full" />
          ) : charts.sales.isError && !charts.sales.data ? (
            <p role="alert" className="grid size-full place-items-center rounded-2xl bg-burgundy/[0.03] px-6 text-center text-sm font-semibold text-burgundy">
              Could not load estimated sales. Please refresh to try again.
            </p>
          ) : charts.sales.data ? (
            <div className="flex size-full flex-col">
              <div className="min-h-0 flex-1">
                <EstimatedSalesBarChart data={charts.sales.data} />
              </div>
              {charts.sales.data.every((day) => day.bookingCount === 0) && (
                <p className="text-center text-xs font-semibold text-wine-ink/50">No approved bookings in this period. Each day is shown as zero.</p>
              )}
              {charts.sales.data.some((day) => day.missingEstimateCount > 0) && (
                <p className="text-center text-xs font-semibold text-wine-ink/50">Incomplete days include approved bookings without a saved estimate.</p>
              )}
              {charts.sales.isError && (
                <p role="alert" className="text-center text-xs font-semibold text-burgundy">Could not refresh estimated sales; showing the last loaded data.</p>
              )}
            </div>
          ) : null}
        </ChartCard>
      </div>

      <PendingRequests today={today} />
    </div>
  );
}

function ChartCard({ title, subtitle, className = "", delay, children }: { title: string; subtitle: string; className?: string; delay: number; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <AdminCard className="relative h-full">
        <h2 className="font-bold text-wine-ink">{title}</h2>
        <p className="text-xs text-wine-ink/50">{subtitle}</p>
        <div className="mt-4 h-60">{children}</div>
      </AdminCard>
    </motion.div>
  );
}

function PendingRequests({ today }: { today: IsoDate | null }) {
  const filters = { status: "pending" as const, sort: "businessDate" as const, order: "asc" as const, pageSize: 6 };
  const pending = useQuery({ queryKey: adminKeys.bookings(filters), queryFn: () => adminApi.bookings(filters) });
  const { approve, reject } = useBookingActions();
  const [rejecting, setRejecting] = useState<BookingDto | null>(null);

  return (
    <AdminCard className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-wine-ink">
            Pending requests
            {pending.data && pending.data.total > 0 && (
              <span className="rounded-full bg-burgundy px-2 py-0.5 text-[11px] font-extrabold text-white">{pending.data.total}</span>
            )}
          </h2>
          <p className="text-xs text-wine-ink/50">Soonest first. Approving confirms the slot for the customer.</p>
        </div>
        <Link href="/admin/bookings?status=pending" className="text-sm font-bold text-burgundy underline-offset-4 hover:underline">
          View all
        </Link>
      </div>

      {pending.isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : (pending.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Inbox} title="All caught up" description="New booking requests appear here instantly." />
      ) : (
        <ul className="divide-y divide-burgundy/8">
          {pending.data?.items.map((booking, index) => (
            <motion.li
              key={booking.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <span aria-hidden className="relative flex size-2.5 shrink-0">
                <span className="absolute inset-0 rounded-full bg-burgundy-bright motion-safe:animate-ping-soft" />
                <span className="relative size-2.5 rounded-full bg-burgundy-bright" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-wine-ink">
                  {booking.customerName} <span className="font-semibold text-wine-ink/50">· {formatPhone(booking.customerPhone)}</span>
                </p>
                <p className="text-sm text-wine-ink/60">
                  {booking.unitName} · {today ? formatBusinessDate(booking.businessDate, today) : booking.businessDate} ·{" "}
                  {formatSlotRange(booking.startHour, booking.durationHours)}
                </p>
              </div>
              <div className="flex gap-2">
                <AdminButton size="sm" onClick={() => approve.mutate(booking)} disabled={approve.isPending && approve.variables?.id === booking.id}>
                  Approve
                </AdminButton>
                <AdminButton size="sm" variant="outline" onClick={() => setRejecting(booking)}>
                  Reject
                </AdminButton>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <RejectDialog
        booking={rejecting}
        pending={reject.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) reject.mutate({ booking: rejecting, reason: reason || undefined });
          setRejecting(null);
        }}
      />
    </AdminCard>
  );
}
