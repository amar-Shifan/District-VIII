"use client";

import { formatHour, type SettingsDto, slotHours } from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, AdminCard, Field, PageHeader, SelectField, Skeleton } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function SettingsScreen() {
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });
  return (
    <div>
      <PageHeader title="Settings" subtitle="Operating hours and booking rules. Changes apply to the customer app immediately." />
      {settings.data ? <SettingsForm key={JSON.stringify(settings.data)} initial={settings.data} /> : <Skeleton className="h-96 rounded-card-sm" />}
    </div>
  );
}

function SettingsForm({ initial }: { initial: SettingsDto }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(initial);
  const preview = slotHours(form);
  const overnight = form.closeHour <= form.openHour;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const mutation = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: (saved) => {
      queryClient.setQueryData(adminKeys.settings, saved);
      void queryClient.invalidateQueries({ queryKey: adminKeys.availabilityAll });
      toast({ tone: "success", title: "Settings saved" });
    },
  });

  const set = <K extends keyof SettingsDto>(key: K, value: SettingsDto[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <AdminCard>
        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (preview.length > 0 && form.arenaName.trim().length >= 2) mutation.mutate();
          }}
        >
          <Field
            label="Arena name"
            value={form.arenaName}
            maxLength={60}
            onChange={(event) => set("arenaName", event.target.value)}
            error={form.arenaName.trim().length < 2 ? "At least 2 characters" : null}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Opens at" value={form.openHour} onChange={(event) => set("openHour", Number(event.target.value))}>
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Closes at"
              value={form.closeHour}
              onChange={(event) => set("closeHour", Number(event.target.value))}
              hint={overnight ? (form.closeHour === form.openHour ? "Open 24 hours" : "Closes after midnight (next morning)") : undefined}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </SelectField>
            <SelectField label="Slot length" value={form.slotDurationHours} onChange={(event) => set("slotDurationHours", Number(event.target.value))}>
              {[1, 2, 3, 4].map((hours) => (
                <option key={hours} value={hours}>
                  {hours} hour{hours > 1 ? "s" : ""}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Booking window"
              value={form.bookingWindowDays}
              onChange={(event) => set("bookingWindowDays", Number(event.target.value))}
              hint="Today plus the following days customers can book"
            >
              {Array.from({ length: 14 }, (_, index) => index + 1).map((days) => (
                <option key={days} value={days}>
                  {days} day{days > 1 ? "s" : ""}
                </option>
              ))}
            </SelectField>
          </div>
          {preview.length === 0 && (
            <p role="alert" className="text-sm font-semibold text-burgundy-bright">
              These hours don&apos;t fit a single slot of that length.
            </p>
          )}
          {mutation.isError && (
            <p role="alert" className="rounded-2xl bg-burgundy/8 px-4 py-2.5 text-sm font-semibold text-burgundy">
              {errorMessage(mutation.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <AdminButton variant="ghost" disabled={!dirty} onClick={() => setForm(initial)}>
              Reset
            </AdminButton>
            <AdminButton type="submit" disabled={!dirty || mutation.isPending || preview.length === 0}>
              {mutation.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Save settings
            </AdminButton>
          </div>
        </form>
      </AdminCard>

      <AdminCard className="h-fit">
        <h2 className="font-bold">Slot preview</h2>
        <p className="text-xs text-wine-ink/55">
          {preview.length} slot{preview.length === 1 ? "" : "s"} per business day. Existing bookings keep their original times.
        </p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {preview.map((hour) => (
            <li key={hour} className="rounded-full border border-burgundy/20 px-2.5 py-1 text-xs font-bold text-burgundy">
              {formatHour(hour)}
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
