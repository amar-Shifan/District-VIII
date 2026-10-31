"use client";

import {
  BOOKING_STATUSES,
  type BookingDto,
  type BookingListQuery,
  type BookingSortField,
  type BookingStatus,
  formatBusinessDate,
  formatPhone,
  formatSlotRange,
  type UnitType,
} from "@district-viii/shared";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Plus, Search, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AdminButton, AdminCard, AdminStatusBadge, EmptyState, Field, PageHeader, Segmented, Skeleton } from "@/components/admin/ui";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { ConfirmDialog, RejectDialog, useBookingActions } from "./booking-actions";
import { useAdminToday } from "./use-admin-today";
import { WalkInModal } from "./WalkInModal";

type StatusFilter = "all" | BookingStatus;
type TypeFilter = "all" | UnitType;
const PAGE_SIZE = 12;

type SortState = { field: BookingSortField; order: "asc" | "desc" };

function SortHeader({ field, sort, onSort, children }: { field: BookingSortField; sort: SortState; onSort: (field: BookingSortField) => void; children: string }) {
  const active = sort.field === field;
  const Arrow = sort.order === "asc" ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? (sort.order === "asc" ? "ascending" : "descending") : "none"} className="px-4 py-3 font-bold">
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 rounded outline-none hover:text-wine-ink focus-visible:ring-2 focus-visible:ring-burgundy">
        {children}
        {active && <Arrow aria-hidden className="size-3" />}
      </button>
    </th>
  );
}

function isStatus(value: string | null): value is BookingStatus {
  return value !== null && (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function BookingsScreen() {
  const params = useSearchParams();
  const initialStatus = params.get("status");
  const { today } = useAdminToday();

  const [status, setStatus] = useState<StatusFilter>(isStatus(initialStatus) ? initialStatus : "all");
  const [type, setType] = useState<TypeFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ field: "createdAt", order: "desc" });
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [rejecting, setRejecting] = useState<BookingDto | null>(null);
  const [cancelling, setCancelling] = useState<BookingDto | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const filters: BookingListQuery = {
    status: status === "all" ? undefined : status,
    type: type === "all" ? undefined : type,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize: PAGE_SIZE,
    sort: sort.field,
    order: sort.order,
  };
  const bookings = useQuery({
    queryKey: adminKeys.bookings(filters),
    queryFn: () => adminApi.bookings(filters),
    placeholderData: keepPreviousData,
  });
  const { approve, reject, cancel } = useBookingActions();

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const toggleSort = (field: BookingSortField) => {
    setSort((current) => ({ field, order: current.field === field && current.order === "desc" ? "asc" : "desc" }));
    setPage(1);
  };

  const data = bookings.data;

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={data ? `${data.total} booking${data.total === 1 ? "" : "s"} match your filters` : "Requests, walk-ins and history"}
        actions={
          <AdminButton icon={Plus} onClick={() => setWalkInOpen(true)}>
            New walk-in booking
          </AdminButton>
        }
      />

      <AdminCard className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Segmented
            label="Status"
            layoutId="bookings-status"
            value={status}
            onChange={resetPage(setStatus)}
            options={[{ value: "all", label: "All" }, ...BOOKING_STATUSES.map((value) => ({ value, label: value[0]?.toUpperCase() + value.slice(1) }))]}
          />
          <Segmented
            label="Unit type"
            layoutId="bookings-type"
            value={type}
            onChange={resetPage(setType)}
            options={[
              { value: "all", label: "All units" },
              { value: "pool", label: "Pool" },
              { value: "ps5", label: "PS5" },
            ]}
          />
          <div className="w-36">
            <Field label="From" type="date" value={from} onChange={(event) => resetPage(setFrom)(event.target.value)} />
          </div>
          <div className="w-36">
            <Field label="To" type="date" value={to} min={from || undefined} onChange={(event) => resetPage(setTo)(event.target.value)} />
          </div>
          <div className="relative min-w-52 flex-1">
            <Field
              label="Search"
              type="search"
              placeholder="Name or phone"
              value={search}
              onChange={(event) => resetPage(setSearch)(event.target.value)}
              className="pl-9"
            />
            <Search aria-hidden className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-wine-ink/40" />
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden p-0">
        <div className="divide-y divide-burgundy/8 lg:hidden">
          {bookings.isPending
            ? Array.from({ length: 4 }, (_, index) => <div key={index} className="p-4"><Skeleton className="h-24" /></div>)
            : data?.items.map((booking) => (
                <article key={booking.id} className="space-y-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-wine-ink">{booking.customerName}</p>
                      <p className="text-xs text-wine-ink/55">{formatPhone(booking.customerPhone)}</p>
                    </div>
                    <AdminStatusBadge status={booking.status} />
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-wine-ink/45">Unit</p><p className="break-words font-semibold">{booking.unitName}</p><p className="text-xs text-wine-ink/55">{booking.unitType === "pool" ? "8 Ball Pool" : "PS5"}</p></div>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-wine-ink/45">Date &amp; time</p><p className="break-words font-semibold">{today ? formatBusinessDate(booking.businessDate, today) : booking.businessDate}</p><p className="text-xs text-wine-ink/55">{formatSlotRange(booking.startHour, booking.durationHours)}</p></div>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-wine-ink/45">Source</p><p className="break-words text-xs font-semibold capitalize text-wine-ink/60">{booking.source}</p></div>
                    <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-wine-ink/45">Requested</p><p className="break-words text-xs text-wine-ink/55">{new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div>
                  </div>
                  {booking.status === "rejected" && booking.rejectionReason && <p className="text-xs text-wine-ink/50">Reason: {booking.rejectionReason}</p>}
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {booking.status === "pending" && <>
                      <AdminButton size="sm" onClick={() => approve.mutate(booking)} aria-label={`Approve ${booking.customerName}`}>Approve</AdminButton>
                      <AdminButton size="sm" variant="outline" onClick={() => setRejecting(booking)} aria-label={`Reject ${booking.customerName}`}>Reject</AdminButton>
                    </>}
                    {(booking.status === "pending" || booking.status === "approved") && <AdminButton size="sm" variant="ghost" onClick={() => setCancelling(booking)} aria-label={`Cancel ${booking.customerName}`}>Cancel</AdminButton>}
                  </div>
                </article>
              ))}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-burgundy/10 bg-burgundy/3 text-xs text-wine-ink/55">
              <tr>
                <SortHeader field="customerName" sort={sort} onSort={toggleSort}>Customer</SortHeader>
                <th scope="col" className="px-4 py-3 font-bold">Unit</th>
                <SortHeader field="businessDate" sort={sort} onSort={toggleSort}>Date &amp; time</SortHeader>
                <SortHeader field="status" sort={sort} onSort={toggleSort}>Status</SortHeader>
                <th scope="col" className="px-4 py-3 font-bold">Source</th>
                <SortHeader field="createdAt" sort={sort} onSort={toggleSort}>Requested</SortHeader>
                <th scope="col" className="px-4 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-burgundy/8">
              {bookings.isPending
                ? Array.from({ length: 6 }, (_, index) => (
                    <tr key={index}>
                      <td colSpan={7} className="px-4 py-3">
                        <Skeleton className="h-9" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((booking, index) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025, duration: 0.25 }}
                      className="transition-colors hover:bg-burgundy/3"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-wine-ink">{booking.customerName}</p>
                        <p className="text-xs text-wine-ink/55">{formatPhone(booking.customerPhone)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{booking.unitName}</p>
                        <p className="text-xs text-wine-ink/55">{booking.unitType === "pool" ? "8 Ball Pool" : "PS5"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{today ? formatBusinessDate(booking.businessDate, today) : booking.businessDate}</p>
                        <p className="text-xs text-wine-ink/55">{formatSlotRange(booking.startHour, booking.durationHours)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge status={booking.status} />
                        {booking.status === "rejected" && booking.rejectionReason && (
                          <p className="mt-1 max-w-40 truncate text-xs text-wine-ink/50" title={booking.rejectionReason}>
                            {booking.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-wine-ink/60 capitalize">{booking.source}</td>
                      <td className="px-4 py-3 text-xs text-wine-ink/55">
                        {new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {booking.status === "pending" && (
                            <>
                              <AdminButton size="sm" onClick={() => approve.mutate(booking)} aria-label={`Approve ${booking.customerName}`}>
                                Approve
                              </AdminButton>
                              <AdminButton size="sm" variant="outline" onClick={() => setRejecting(booking)} aria-label={`Reject ${booking.customerName}`}>
                                Reject
                              </AdminButton>
                            </>
                          )}
                          {(booking.status === "pending" || booking.status === "approved") && (
                            <AdminButton size="sm" variant="ghost" onClick={() => setCancelling(booking)} aria-label={`Cancel ${booking.customerName}`}>
                              Cancel
                            </AdminButton>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.items.length === 0 && (
          <EmptyState icon={SearchX} title="No bookings found" description="Try a different status, date range or search." />
        )}

        {data && data.totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between border-t border-burgundy/10 px-4 py-3 text-sm">
            <p className="text-wine-ink/60">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <AdminButton size="sm" variant="outline" icon={ChevronLeft} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                Previous
              </AdminButton>
              <AdminButton size="sm" variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((value) => value + 1)}>
                Next
                <ChevronRight aria-hidden className="size-3.5" />
              </AdminButton>
            </div>
          </nav>
        )}
      </AdminCard>

      <WalkInModal open={walkInOpen} onClose={() => setWalkInOpen(false)} />
      <RejectDialog
        booking={rejecting}
        pending={reject.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) reject.mutate({ booking: rejecting, reason: reason || undefined });
          setRejecting(null);
        }}
      />
      <ConfirmDialog
        open={cancelling !== null}
        title="Cancel booking"
        description={cancelling ? `${cancelling.customerName} · ${cancelling.unitName}. The slot becomes free again.` : ""}
        confirmLabel="Cancel booking"
        pending={cancel.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) cancel.mutate(cancelling);
          setCancelling(null);
        }}
      />
    </div>
  );
}
