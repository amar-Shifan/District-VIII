"use client";

import {
  addDays,
  formatBusinessDate,
  formatSlotRange,
  type IsoDate,
  normalizePhone,
  type UnitType,
  validateCustomerName,
  validatePhone,
} from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/admin/Overlay";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, Field, Segmented, SelectField } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";
import { useAdminToday } from "./use-admin-today";

const WALK_IN_DAYS = 7;

export function WalkInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="New walk-in booking" description="Walk-in and phone bookings are approved immediately.">
      {open && <WalkInForm onDone={onClose} />}
    </Modal>
  );
}

function WalkInForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { today, settings } = useAdminToday();
  const [type, setType] = useState<UnitType>("pool");
  const [pickedDate, setPickedDate] = useState<IsoDate | null>(null);
  const [unitId, setUnitId] = useState("");
  const [hour, setHour] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const date = pickedDate ?? today;
  const availability = useQuery({
    queryKey: adminKeys.availability(type, date ?? ""),
    queryFn: () => adminApi.availability(type, date ?? ""),
    enabled: date !== null,
  });
  const units = availability.data?.units ?? [];
  const unit = units.find((entry) => entry.unit.id === unitId) ?? units.find((entry) => entry.unit.status !== "maintenance");
  const openSlots = unit?.slots.filter((slot) => slot.state === "available") ?? [];
  const slot = openSlots.find((item) => String(item.startHour) === hour) ?? openSlots[0];

  const nameError = submitted ? validateCustomerName(name) : null;
  const phoneError = submitted ? validatePhone(phone) : null;

  const mutation = useMutation({
    mutationFn: adminApi.createWalkIn,
    onSuccess: (booking) => {
      toast({ tone: "success", title: "Walk-in booked", description: `${booking.customerName} · ${booking.unitName}` });
      void queryClient.invalidateQueries({ queryKey: adminKeys.all });
      onDone();
    },
  });

  const submit = () => {
    setSubmitted(true);
    if (!unit || !slot || !date || validateCustomerName(name) || validatePhone(phone)) return;
    mutation.mutate({
      unitId: unit.unit.id,
      businessDate: date,
      startHour: slot.startHour,
      customerName: name.trim(),
      customerPhone: normalizePhone(phone) ?? phone,
    });
  };

  return (
    <div className="space-y-4">
      <Segmented
        label="Unit type"
        layoutId="walk-in-type"
        value={type}
        onChange={(value) => {
          setType(value);
          setUnitId("");
          setHour("");
        }}
        options={[
          { value: "pool", label: "8 Ball Pool" },
          { value: "ps5", label: "PS5" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Date"
          value={date ?? ""}
          onChange={(event) => {
            setPickedDate(event.target.value);
            setHour("");
          }}
        >
          {today &&
            Array.from({ length: WALK_IN_DAYS }, (_, index) => addDays(today, index)).map((value) => (
              <option key={value} value={value}>
                {formatBusinessDate(value, today)}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Unit"
          value={unit?.unit.id ?? ""}
          onChange={(event) => {
            setUnitId(event.target.value);
            setHour("");
          }}
          disabled={units.length === 0}
        >
          {units.map((entry) => (
            <option key={entry.unit.id} value={entry.unit.id} disabled={entry.unit.status === "maintenance"}>
              {entry.unit.name}
              {entry.unit.status === "maintenance" ? " (maintenance)" : ""}
            </option>
          ))}
        </SelectField>
      </div>
      <SelectField
        label="Time"
        value={slot ? String(slot.startHour) : ""}
        onChange={(event) => setHour(event.target.value)}
        disabled={openSlots.length === 0}
        hint={availability.isPending ? "Loading free hours…" : openSlots.length === 0 ? "No free hours for this unit and date" : undefined}
      >
        {openSlots.map((item) => (
          <option key={item.startHour} value={item.startHour}>
            {formatSlotRange(item.startHour, settings?.slotDurationHours ?? 1)}
          </option>
        ))}
      </SelectField>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} error={nameError} />
        <Field label="Phone" type="tel" value={phone} maxLength={16} onChange={(event) => setPhone(event.target.value)} error={phoneError} />
      </div>
      {mutation.isError && (
        <p role="alert" className="rounded-2xl bg-burgundy/8 px-4 py-2.5 text-sm font-semibold text-burgundy">
          {errorMessage(mutation.error)}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <AdminButton variant="ghost" onClick={onDone}>
          Cancel
        </AdminButton>
        <AdminButton onClick={submit} disabled={mutation.isPending || !slot}>
          {mutation.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Book walk-in
        </AdminButton>
      </div>
    </div>
  );
}
