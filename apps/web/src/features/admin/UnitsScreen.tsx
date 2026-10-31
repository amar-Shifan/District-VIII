"use client";

import { formatIstClock, type UnitDto, type UnitStatus, type UnitType } from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Gamepad2, Monitor, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { useState } from "react";
import { EightBallIcon } from "@/components/icons/EightBallIcon";
import { Modal } from "@/components/admin/Overlay";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, AdminCard, EmptyState, Field, PageHeader, Segmented, SelectField, Skeleton, Switch } from "@/components/admin/ui";
import { formatCountdown, useNow } from "@/hooks/use-now";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";
import { ConfirmDialog } from "./booking-actions";

const BUSY_DURATIONS = [
  { minutes: 30, label: "30m" },
  { minutes: 60, label: "1h" },
  { minutes: 90, label: "1.5h" },
  { minutes: 120, label: "2h" },
  { minutes: 180, label: "3h" },
];

function useUnitMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const onSettled = () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.units });
    void queryClient.invalidateQueries({ queryKey: adminKeys.stats });
  };
  const onError = (error: unknown) => toast({ tone: "error", title: "Couldn't update unit", description: errorMessage(error) });
  return {
    status: useMutation({
      mutationFn: ({ unit, status, minutes }: { unit: UnitDto; status: UnitStatus; minutes?: number }) =>
        adminApi.updateUnitStatus(unit.id, {
          status,
          busyUntil: status === "busy" && minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : undefined,
        }),
      onError,
      onSettled,
    }),
    update: useMutation({
      mutationFn: ({ id, name, isActive }: { id: string; name?: string; isActive?: boolean }) => adminApi.updateUnit(id, { name, isActive }),
      onError,
      onSettled,
    }),
    remove: useMutation({
      mutationFn: (unit: UnitDto) => adminApi.deleteUnit(unit.id),
      onSuccess: () => toast({ tone: "success", title: "Unit deleted" }),
      onError,
      onSettled,
    }),
  };
}

export function UnitsScreen() {
  const units = useQuery({ queryKey: adminKeys.units, queryFn: adminApi.units });
  const now = useNow(1000);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<UnitDto | null>(null);
  const [deleting, setDeleting] = useState<UnitDto | null>(null);
  const mutations = useUnitMutations();

  const groups: { type: UnitType; title: string }[] = [
    { type: "pool", title: "8 Ball Pool tables" },
    { type: "ps5", title: "PS5 stations" },
  ];

  return (
    <div>
      <PageHeader
        title="Units"
        subtitle="Set live status, mark busy for walk-ins, or take a unit out for maintenance."
        actions={
          <AdminButton icon={Plus} onClick={() => setAdding(true)}>
            Add unit
          </AdminButton>
        }
      />

      {units.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-56 rounded-card-sm" />
          ))}
        </div>
      ) : (units.data ?? []).length === 0 ? (
        <AdminCard>
          <EmptyState icon={Monitor} title="No units yet" description="Add your pool tables and PS5 stations to start taking bookings." />
        </AdminCard>
      ) : (
        groups.map((group) => {
          const list = (units.data ?? []).filter((unit) => unit.type === group.type);
          if (list.length === 0) return null;
          return (
            <section key={group.type} className="mb-8" aria-labelledby={`units-${group.type}`}>
              <h2 id={`units-${group.type}`} className="mb-3 text-xs font-bold tracking-[0.2em] text-wine-ink/50 uppercase">
                {group.title}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((unit, index) => (
                  <UnitCard
                    key={unit.id}
                    unit={unit}
                    now={now}
                    index={index}
                    mutations={mutations}
                    onEdit={() => setEditing(unit)}
                    onDelete={() => setDeleting(unit)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <UnitFormModal open={adding} onClose={() => setAdding(false)} />
      <UnitFormModal open={editing !== null} unit={editing ?? undefined} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "unit"}`}
        description="Units with upcoming bookings can't be deleted. Deactivate them instead to hide them from customers."
        confirmLabel="Delete unit"
        pending={mutations.remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) mutations.remove.mutate(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function UnitCard({
  unit,
  now,
  index,
  mutations,
  onEdit,
  onDelete,
}: {
  unit: UnitDto;
  now: Date | null;
  index: number;
  mutations: ReturnType<typeof useUnitMutations>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pickingBusy, setPickingBusy] = useState(false);
  const busyActive = unit.status === "busy" && unit.busyUntil && now && Date.parse(unit.busyUntil) > now.getTime();
  const shownStatus: UnitStatus = unit.status === "busy" && !busyActive && now ? "free" : unit.status;
  const Icon = unit.type === "pool" ? EightBallIcon : Gamepad2;
  const saving = mutations.status.isPending && mutations.status.variables?.unit.id === unit.id;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-card-sm border bg-white p-5 shadow-admin transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-admin-lift ${
        unit.isActive ? "border-burgundy/10" : "border-dashed border-wine-ink/20 opacity-75"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full text-white ${shownStatus === "maintenance" ? "bg-wine-ink/40" : "bg-sidebar"}`}>
          <Icon aria-hidden strokeWidth={1.75} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="-skew-x-8 font-display text-2xl leading-none text-wine-ink">{unit.name}</h3>
          <p className="mt-1 text-xs font-semibold text-wine-ink/55">
            {busyActive && unit.busyUntil && now ? (
              <span className="inline-flex items-center gap-1 text-burgundy">
                <Timer aria-hidden className="size-3.5" />
                {formatCountdown(unit.busyUntil, now)} left · until {formatIstClock(unit.busyUntil)}
              </span>
            ) : shownStatus === "maintenance" ? (
              "Out of service"
            ) : (
              "Ready for players"
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <AdminButton variant="ghost" size="sm" className="!px-2" aria-label={`Edit ${unit.name}`} onClick={onEdit}>
            <Pencil aria-hidden className="size-4" />
          </AdminButton>
          <AdminButton variant="ghost" size="sm" className="!px-2" aria-label={`Delete ${unit.name}`} onClick={onDelete}>
            <Trash2 aria-hidden className="size-4" />
          </AdminButton>
        </div>
      </div>

      <div className="mt-4">
        <Segmented
          label={`${unit.name} status`}
          layoutId={`unit-status-${unit.id}`}
          value={pickingBusy ? "busy" : shownStatus}
          onChange={(status) => {
            if (status === "busy") {
              setPickingBusy(true);
              return;
            }
            setPickingBusy(false);
            mutations.status.mutate({ unit, status });
          }}
          options={[
            { value: "free", label: "Free" },
            { value: "busy", label: "Busy" },
            { value: "maintenance", label: "Maintenance" },
          ]}
        />
      </div>

      <AnimatePresence initial={false}>
        {(pickingBusy || busyActive) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3"
          >
            <p className="mb-1.5 text-xs font-bold text-wine-ink/55">{busyActive ? "Reset busy time to" : "Busy for"}</p>
            <div className="flex flex-wrap gap-1.5">
              {BUSY_DURATIONS.map((option) => (
                <AdminButton
                  key={option.minutes}
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    mutations.status.mutate({ unit, status: "busy", minutes: option.minutes });
                    setPickingBusy(false);
                  }}
                >
                  {option.label}
                </AdminButton>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between border-t border-burgundy/8 pt-3">
        <span className="text-xs font-semibold text-wine-ink/60">{unit.isActive ? "Visible to customers" : "Hidden from customers"}</span>
        <Switch
          checked={unit.isActive}
          label={`${unit.name} active`}
          onChange={(isActive) => mutations.update.mutate({ id: unit.id, isActive })}
        />
      </div>
    </motion.article>
  );
}

function UnitFormModal({ open, unit, onClose }: { open: boolean; unit?: UnitDto; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={unit ? `Edit ${unit.name}` : "Add unit"}>
      {open && <UnitForm key={unit?.id ?? "new"} unit={unit} onDone={onClose} />}
    </Modal>
  );
}

function UnitForm({ unit, onDone }: { unit?: UnitDto; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(unit?.name ?? "");
  const [type, setType] = useState<UnitType>(unit?.type ?? "pool");
  const [isActive, setIsActive] = useState(unit?.isActive ?? true);
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && name.trim().length === 0 ? "Give the unit a name" : null;

  const mutation = useMutation({
    mutationFn: () =>
      unit ? adminApi.updateUnit(unit.id, { name: name.trim(), isActive }) : adminApi.createUnit({ name: name.trim(), type, isActive }),
    onSuccess: (saved) => {
      toast({ tone: "success", title: unit ? "Unit updated" : "Unit added", description: saved.name });
      void queryClient.invalidateQueries({ queryKey: adminKeys.units });
      onDone();
    },
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (name.trim()) mutation.mutate();
      }}
    >
      <Field label="Name" value={name} maxLength={40} placeholder="e.g. Table 4" onChange={(event) => setName(event.target.value)} error={nameError} data-autofocus />
      {!unit && (
        <SelectField label="Type" value={type} onChange={(event) => setType(event.target.value as UnitType)}>
          <option value="pool">8 Ball Pool table</option>
          <option value="ps5">PS5 station</option>
        </SelectField>
      )}
      <div className="flex items-center justify-between rounded-2xl border border-burgundy/10 px-4 py-3">
        <span className="text-sm font-semibold">Visible to customers</span>
        <Switch checked={isActive} onChange={setIsActive} label="Visible to customers" />
      </div>
      {mutation.isError && (
        <p role="alert" className="rounded-2xl bg-burgundy/8 px-4 py-2.5 text-sm font-semibold text-burgundy">
          {errorMessage(mutation.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <AdminButton variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={mutation.isPending}>
          {unit ? "Save changes" : "Add unit"}
        </AdminButton>
      </div>
    </form>
  );
}
