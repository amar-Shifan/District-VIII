"use client";

import {
  type BookingDto,
  type IsoDate,
  normalizePhone,
  validateCustomerName,
  validatePhone,
} from "@district-viii/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { PillButton } from "@/components/PillButton";
import { TextField } from "@/components/TextField";
import { ApiError, createBooking } from "@/lib/api";
import { errorMessage } from "@/lib/api-error";
import { type CustomerProfile, saveCustomerProfile } from "@/lib/customer-profile";
import { queryKeys } from "@/lib/query-keys";

export interface SlotSelection {
  unitId: string;
  unitName: string;
  businessDate: IsoDate;
  startHour: number;
  dateLabel: string;
  timeLabel: string;
}

interface BookingFormProps {
  selection: SlotSelection;
  profile: CustomerProfile | null;
  onBooked: (booking: BookingDto) => void;
  onPickAnother: () => void;
}

export function BookingForm({ selection, profile, onBooked, onPickAnother }: BookingFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(profile?.name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [touched, setTouched] = useState({ name: false, phone: false });
  const [submitted, setSubmitted] = useState(false);

  const nameError = validateCustomerName(name);
  const phoneError = validatePhone(phone);
  const showName = (touched.name || submitted) && nameError;
  const showPhone = (touched.phone || submitted) && phoneError;

  const mutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (booking) => {
      saveCustomerProfile({ name: booking.customerName, phone: booking.customerPhone });
      void queryClient.invalidateQueries({ queryKey: queryKeys.availabilityAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.unitsSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookingsAll });
      onBooked(booking);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isConflict) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.availabilityAll });
      }
    },
  });

  const conflict = mutation.error instanceof ApiError && mutation.error.isConflict;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (nameError || phoneError || mutation.isPending) return;
    mutation.mutate({
      unitId: selection.unitId,
      businessDate: selection.businessDate,
      startHour: selection.startHour,
      customerName: name.trim(),
      customerPhone: normalizePhone(phone) ?? phone,
    });
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <dl className="bg-card-gradient grid grid-cols-3 gap-2 rounded-card-sm border border-white/10 p-4 shadow-card">
        {[
          ["Unit", selection.unitName],
          ["Date", selection.dateLabel],
          ["Time", selection.timeLabel],
        ].map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="text-[10px] font-bold tracking-[0.2em] text-blush uppercase">{term}</dt>
            <dd className="mt-1 truncate text-sm font-bold text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {conflict ? (
        <div role="alert" className="rounded-card-sm border border-burgundy-bright bg-burgundy-dark/60 p-4">
          <p className="flex items-center gap-2 font-bold text-white">
            <AlertTriangle aria-hidden className="size-4 text-blush" />
            That slot was just taken
          </p>
          <p className="mt-1 text-sm text-blush">
            Someone requested it a moment ago. The grid has been refreshed, so pick another time.
          </p>
          <PillButton type="button" variant="light" className="mt-3 w-full" onClick={onPickAnother} data-autofocus>
            Pick another time
          </PillButton>
        </div>
      ) : (
        <>
          <TextField
            label="Your name"
            name="name"
            autoComplete="name"
            placeholder="e.g. Arjun Menon"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched((state) => ({ ...state, name: true }))}
            error={showName ? nameError : null}
            data-autofocus
          />
          <TextField
            label="Phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="98765 43210"
            value={phone}
            maxLength={16}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => setTouched((state) => ({ ...state, phone: true }))}
            error={showPhone ? phoneError : null}
            hint="10-digit Indian mobile. We use it to find your booking."
          />

          {mutation.isError && (
            <p role="alert" className="text-sm font-semibold text-white">
              {errorMessage(mutation.error)}
            </p>
          )}

          <PillButton type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
            {mutation.isPending ? "Sending request…" : "Request booking"}
          </PillButton>
          <p className="text-center text-xs text-blush/80">An admin confirms requests shortly. No payment needed now.</p>
        </>
      )}
    </form>
  );
}
