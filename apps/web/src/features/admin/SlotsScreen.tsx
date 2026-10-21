"use client";

import {
  type BlockedSlotDto,
  formatHour,
  formatSlotRange,
  type IsoDate,
  type SlotDto,
  type SlotState,
  type UnitType,
} from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ban, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/admin/Overlay";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, AdminCard, Field, PageHeader, Segmented, SelectField, Skeleton, TextAreaField } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";
import { useAdminToday } from "./use-admin-today";

const CELL_STYLE: Record<SlotState | "blocked", string> = {
  available: "border-burgundy/20 bg-white text-wine-ink hover:border-burgundy hover:shadow-admin-lift",
  pending: "border-burgundy bg-white text-burgundy",
  booked: "border-transparent bg-burgundy text-white",
  busy: "border-transparent bg-burgundy/12 text-burgundy",
  maintenance: "border-transparent bg-wine-ink/8 text-wine-ink/50",
  past: "border-transparent bg-wine-ink/4 text-wine-ink/30",
  blocked: "border-dashed border-burgundy bg-burgundy/6 text-burgundy hover:bg-burgundy/10",
};

const CELL_LABEL: Record<SlotState | "blocked", string> = {
  available: "Open",
  pending: "Pending",
  booked: "Booked",
  busy: "Unit busy",
  maintenance: "Maintenance",
  past: "Past",
  blocked: "Blocked",
};

type Editing = { kind: "block"; slot: SlotDto } | { kind: "blocked"; blocked: BlockedSlotDto };

export function SlotsScreen() {
  const { today, settings } = useAdminToday();
  const [pickedDate, setPickedDate] = useState<IsoDate | null>(null);
  const [type, setType] = useState<UnitType>("pool");
  const [unitId, setUnitId] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const date = pickedDate ?? today;

  const availability = useQuery({
    queryKey: adminKeys.availability(type, date ?? ""),
    queryFn: () => adminApi.availability(type, date ?? ""),
    enabled: date !== null,
  });
  const blocked = useQuery({
    queryKey: adminKeys.blockedSlots(date ?? ""),
    queryFn: () => adminApi.blockedSlots(date ?? ""),
    enabled: date !== null,
  });

  const units = availability.data?.units ?? [];
  const active = units.find((entry) => entry.unit.id === unitId) ?? units[0];
  const blockedByHour = new Map(
    (blocked.data ?? []).filter((item) => item.unitId === active?.unit.id).map((item) => [item.startHour, item]),
  );

  return (
    <div>
      <PageHeader title="Slots" subtitle="Block hours for tournaments, private events or repairs. Customers see them as unavailable." />

      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <AdminCard>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-44">
              <Field label="Date" type="date" value={date ?? ""} onChange={(event) => event.target.value && setPickedDate(event.target.value)} />
            </div>
            <Segmented
              label="Unit type"
              layoutId="slots-type"
              value={type}
              onChange={(value) => {
                setType(value);
                setUnitId("");
              }}
              options={[
                { value: "pool", label: "8 Ball Pool" },
                { value: "ps5", label: "PS5" },
              ]}
            />
            <div className="w-44">
              <SelectField label="Unit" value={active?.unit.id ?? ""} onChange={(event) => setUnitId(event.target.value)} disabled={units.length === 0}>
                {units.map((entry) => (
                  <option key={entry.unit.id} value={entry.unit.id}>
                    {entry.unit.name}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div className="mt-6">
            {availability.isPending || blocked.isPending ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }, (_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : availability.isError ? (
              <p role="alert" className="text-sm font-semibold text-burgundy">
                {errorMessage(availability.error)}
              </p>
            ) : !active ? (
              <p className="text-sm text-wine-ink/60">No active units of this type.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label={`Hours for ${active.unit.name}`}>
                {active.slots.map((slot, index) => {
                  const block = blockedByHour.get(slot.startHour);
                  const state: SlotState | "blocked" = block && slot.state !== "past" ? "blocked" : slot.state;
                  const clickable = state === "available" || state === "blocked";
                  return (
                    <motion.li
                      key={slot.startHour}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => setEditing(block ? { kind: "blocked", blocked: block } : { kind: "block", slot })}
                        aria-label={`${formatSlotRange(slot.startHour, settings?.slotDurationHours ?? 1)}: ${CELL_LABEL[state]}${block ? `, ${block.reason}` : ""}`}
                        className={`flex h-20 w-full flex-col items-start justify-between rounded-2xl border p-3 text-left transition-[box-shadow,border-color,background-color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-burgundy active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 ${CELL_STYLE[state]}`}
                      >
                        <span className="text-sm font-extrabold">{formatHour(slot.startHour)}</span>
                        <span className="w-full truncate text-[11px] font-semibold opacity-80">{block ? block.reason : CELL_LABEL[state]}</span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard className="h-fit">
          <h2 className="font-bold">Operating hours</h2>
          {settings ? (
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Opens", formatHour(settings.openHour)],
                ["Closes", formatHour(settings.closeHour)],
                ["Slot length", `${settings.slotDurationHours} hour${settings.slotDurationHours > 1 ? "s" : ""}`],
                ["Booking window", `${settings.bookingWindowDays} days`],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between">
                  <dt className="text-wine-ink/60">{term}</dt>
                  <dd className="font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Skeleton className="mt-3 h-24" />
          )}
          <Link
            href="/admin/settings"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-burgundy underline-offset-4 hover:underline"
          >
            <Settings aria-hidden className="size-4" />
            Edit in settings
          </Link>
        </AdminCard>
      </div>

      <SlotModal editing={editing} unitId={active?.unit.id} unitName={active?.unit.name} date={date} durationHours={settings?.slotDurationHours ?? 1} onClose={() => setEditing(null)} />
    </div>
  );
}

function SlotModal({
  editing,
  unitId,
  unitName,
  date,
  durationHours,
  onClose,
}: {
  editing: Editing | null;
  unitId?: string;
  unitName?: string;
  date: IsoDate | null;
  durationHours: number;
  onClose: () => void;
}) {
  const hour = editing?.kind === "block" ? editing.slot.startHour : editing?.blocked.startHour;
  return (
    <Modal
      open={editing !== null}
      onClose={onClose}
      title={editing?.kind === "blocked" ? "Blocked hour" : "Block this hour"}
      description={hour !== undefined ? `${unitName ?? ""} · ${formatSlotRange(hour, durationHours)}` : undefined}
    >
      {editing && unitId && date && (
        <SlotForm key={editing.kind === "blocked" ? editing.blocked.id : `${unitId}-${hour}`} editing={editing} unitId={unitId} date={date} onDone={onClose} />
      )}
    </Modal>
  );
}

function SlotForm({ editing, unitId, date, onDone }: { editing: Editing; unitId: string; date: IsoDate; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [reason, setReason] = useState(editing.kind === "blocked" ? editing.blocked.reason : "");
  const [submitted, setSubmitted] = useState(false);
  const reasonError = submitted && reason.trim().length < 2 ? "Add a short reason (staff only)" : null;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.availabilityAll });
    void queryClient.invalidateQueries({ queryKey: adminKeys.blockedSlotsAll });
  };
  const save = useMutation({
    mutationFn: () =>
      editing.kind === "blocked"
        ? adminApi.updateBlockedSlot(editing.blocked.id, reason.trim())
        : adminApi.blockSlot({ unitId, businessDate: date, startHour: editing.slot.startHour, reason: reason.trim() }),
    onSuccess: () => {
      toast({ tone: "success", title: editing.kind === "blocked" ? "Reason updated" : "Hour blocked" });
      refresh();
      onDone();
    },
  });
  const unblock = useMutation({
    mutationFn: () => (editing.kind === "blocked" ? adminApi.unblockSlot(editing.blocked.id) : Promise.resolve()),
    onSuccess: () => {
      toast({ tone: "success", title: "Hour unblocked" });
      refresh();
      onDone();
    },
  });

  const error = save.error ?? unblock.error;
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (reason.trim().length >= 2) save.mutate();
      }}
    >
      <TextAreaField
        label="Reason"
        placeholder="e.g. Weekend tournament"
        maxLength={200}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={reasonError}
        data-autofocus
      />
      {error && (
        <p role="alert" className="rounded-2xl bg-burgundy/8 px-4 py-2.5 text-sm font-semibold text-burgundy">
          {errorMessage(error)}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {editing.kind === "blocked" && (
          <AdminButton variant="outline" icon={Ban} className="mr-auto" disabled={unblock.isPending} onClick={() => unblock.mutate()}>
            Unblock hour
          </AdminButton>
        )}
        <AdminButton variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={save.isPending}>
          {editing.kind === "blocked" ? "Save reason" : "Block hour"}
        </AdminButton>
      </div>
    </form>
  );
}
