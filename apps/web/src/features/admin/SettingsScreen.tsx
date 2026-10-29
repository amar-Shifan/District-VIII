"use client";

import { formatHour, type SettingsDto, type UpdateSettingsInput, slotHours } from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, AdminCard, Field, PageHeader, SelectField, Skeleton } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { ApiError, errorMessage } from "@/lib/api-error";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

export function SettingsScreen() {
  const settings = useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings });
  return (
    <div>
      <PageHeader title="Settings" subtitle="Operating hours and booking rules. Changes apply to the customer app immediately." />
      {settings.data ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <SettingsForm initial={settings.data} />
          <SlotPreview settings={settings.data} />
          <GamingPrices settings={settings.data} />
        </div>
      ) : (
        <Skeleton className="h-96 rounded-card-sm" />
      )}
    </div>
  );
}

function SettingsForm({ initial }: { initial: SettingsDto }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(() => operatingSettings(initial));
  const preview = slotHours(form);
  const overnight = form.closeHour <= form.openHour;
  const dirty = JSON.stringify(form) !== JSON.stringify(operatingSettings(initial));

  const mutation = useMutation({
    mutationFn: () => adminApi.updateSettings(form),
    onSuccess: (saved) => {
      queryClient.setQueryData(adminKeys.settings, saved);
      void queryClient.invalidateQueries({ queryKey: adminKeys.availabilityAll });
      toast({ tone: "success", title: "Settings saved" });
    },
  });

  const set = <K extends keyof OperatingSettings>(key: K, value: OperatingSettings[K]) => setForm((current) => ({ ...current, [key]: value }));

  return (
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
            <AdminButton variant="ghost" disabled={!dirty} onClick={() => setForm(operatingSettings(initial))}>
              Reset
            </AdminButton>
            <AdminButton type="submit" disabled={!dirty || mutation.isPending || preview.length === 0}>
              {mutation.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
              Save settings
            </AdminButton>
          </div>
        </form>
      </AdminCard>
  );
}

type OperatingSettings = Pick<SettingsDto, "arenaName" | "openHour" | "closeHour" | "slotDurationHours" | "bookingWindowDays">;

function operatingSettings(settings: SettingsDto): OperatingSettings {
  return {
    arenaName: settings.arenaName,
    openHour: settings.openHour,
    closeHour: settings.closeHour,
    slotDurationHours: settings.slotDurationHours,
    bookingWindowDays: settings.bookingWindowDays,
  };
}

function SlotPreview({ settings }: { settings: SettingsDto }) {
  const preview = slotHours(settings);
  return (
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
  );
}

type GamingPriceField = "ps5PricePerHour" | "poolPricePerHour";

function GamingPrices({ settings }: { settings: SettingsDto }) {
  return (
    <AdminCard className="xl:col-span-2">
      <div className="mb-4">
        <h2 className="font-bold">Gaming Prices</h2>
        <p className="text-xs text-wine-ink/55">Estimated booking value uses this hourly rate multiplied by the booked duration.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <GamingPriceEditor key={`ps5-${settings.ps5PricePerHour ?? "unset"}`} label="PS5" field="ps5PricePerHour" price={settings.ps5PricePerHour} />
        <GamingPriceEditor key={`pool-${settings.poolPricePerHour ?? "unset"}`} label="8-Ball Pool" field="poolPricePerHour" price={settings.poolPricePerHour} />
      </div>
    </AdminCard>
  );
}

function GamingPriceEditor({ label, field, price }: { label: string; field: GamingPriceField; price: number | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rawPrice, setRawPrice] = useState(price === null ? "" : String(price));
  const trimmed = rawPrice.trim();
  const parsed = trimmed === "" ? null : Number(trimmed);
  const invalid =
    trimmed !== "" &&
    (!Number.isFinite(parsed) || parsed! < 0 || parsed! > 100_000 || !/^\d+(?:\.\d{1,2})?$/.test(trimmed));
  const dirty = parsed !== price;

  const mutation = useMutation({
    mutationFn: async () => {
      const input: UpdateSettingsInput = field === "ps5PricePerHour" ? { ps5PricePerHour: parsed } : { poolPricePerHour: parsed };
      const saved = await adminApi.updateSettings(input);
      if (saved[field] !== parsed) throw new Error(`The server did not confirm the ${label} rate. Your entry has been kept.`);
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(adminKeys.settings, saved);
      setRawPrice(saved[field] === null ? "" : String(saved[field]));
      toast({ tone: "success", title: `${label} hourly rate saved` });
    },
  });

  return (
    <form
      className="rounded-2xl border border-burgundy/10 bg-burgundy/[0.025] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!invalid && dirty && !mutation.isPending) mutation.mutate();
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-bold text-wine-ink">{label}</h3>
        <span className="text-sm font-extrabold text-burgundy">{price === null ? "Not set" : INR.format(price)} / hour</span>
      </div>
      <Field
        label={`${label} price per hour (INR)`}
        type="number"
        min={0}
        max={100_000}
        step="0.01"
        inputMode="decimal"
        value={rawPrice}
        onChange={(event) => setRawPrice(event.target.value)}
        hint="Rates may be blank until configured. Maximum INR 100,000; up to 2 decimal places."
        error={invalid ? "Enter a valid amount from INR 0 to INR 100,000 with up to 2 decimal places." : null}
      />
      {mutation.isError && (
        <p role="alert" className="mt-2 text-sm font-semibold text-burgundy">
          {mutation.error instanceof Error && !(mutation.error instanceof ApiError)
            ? mutation.error.message
            : errorMessage(mutation.error, "Could not save the rate. Your entry has been kept; please try again.")}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <AdminButton type="submit" size="sm" disabled={!dirty || invalid || mutation.isPending}>
          {mutation.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          Save {label} price
        </AdminButton>
      </div>
    </form>
  );
}
