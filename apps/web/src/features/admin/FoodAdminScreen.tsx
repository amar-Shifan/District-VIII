"use client";

import type { FoodItemDto, UpsertFoodItemInput } from "@district-viii/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { FoodImage } from "@/components/FoodImage";
import { Drawer } from "@/components/admin/Overlay";
import { useToast } from "@/components/admin/Toaster";
import { AdminButton, AdminCard, EmptyState, Field, PageHeader, Segmented, Skeleton, Switch, TextAreaField } from "@/components/admin/ui";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { errorMessage } from "@/lib/api-error";
import { ConfirmDialog } from "./booking-actions";

const PRICE = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function FoodAdminScreen() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const food = useQuery({ queryKey: adminKeys.food, queryFn: adminApi.food });
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<FoodItemDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<FoodItemDto | null>(null);

  const items = [...(food.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const visible = items.filter((item) => category === "all" || item.category === category);

  const onError = (error: unknown) => toast({ tone: "error", title: "Couldn't update the menu", description: errorMessage(error) });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: adminKeys.food });

  const toggle = useMutation({ mutationFn: (item: FoodItemDto) => adminApi.toggleFood(item.id), onError, onSettled: refresh });
  const remove = useMutation({
    mutationFn: (item: FoodItemDto) => adminApi.deleteFood(item.id),
    onSuccess: () => toast({ tone: "success", title: "Item deleted" }),
    onError,
    onSettled: refresh,
  });
  const move = useMutation({
    mutationFn: async ({ item, neighbour, direction }: { item: FoodItemDto; neighbour: FoodItemDto; direction: -1 | 1 }) => {
      // Swap positions; nudge apart when both share the same sortOrder.
      const itemOrder = neighbour.sortOrder === item.sortOrder ? Math.max(0, neighbour.sortOrder + direction) : neighbour.sortOrder;
      await Promise.all([adminApi.updateFood(item.id, { sortOrder: itemOrder }), adminApi.updateFood(neighbour.id, { sortOrder: item.sortOrder })]);
    },
    onError,
    onSettled: refresh,
  });

  return (
    <div>
      <PageHeader
        title="Food"
        subtitle="The customer menu shows available items in this order. Prices stay hidden from customers for now."
        actions={
          <AdminButton icon={Plus} onClick={() => setEditing("new")}>
            Add item
          </AdminButton>
        }
      />

      {categories.length > 0 && (
        <div className="mb-4">
          <Segmented
            label="Category"
            layoutId="food-category"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All" }, ...categories.map((value) => ({ value, label: value }))]}
          />
        </div>
      )}

      {food.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-32 rounded-card-sm" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <AdminCard>
          <EmptyState icon={UtensilsCrossed} title="No items yet" description="Add burgers, snacks, drinks and meals to build the menu." />
        </AdminCard>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {visible.map((item, index) => {
            const position = items.indexOf(item);
            const previous = items[position - 1];
            const next = items[position + 1];
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 10) * 0.035, duration: 0.35 }}
                className={`flex gap-4 rounded-card-sm border bg-white p-4 shadow-admin transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-admin-lift ${
                  item.isAvailable ? "border-burgundy/10" : "border-dashed border-wine-ink/20"
                }`}
              >
                <FoodImage src={item.imageUrl} alt={item.name} size={88} className={`rounded-2xl ${item.isAvailable ? "" : "opacity-50 grayscale"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold tracking-widest text-burgundy uppercase">{item.category}</p>
                      <h2 className="truncate font-bold text-wine-ink">{item.name}</h2>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-wine-ink/70">{item.price !== null ? PRICE.format(item.price) : "—"}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-wine-ink/60">{item.description || "No description"}</p>
                  <div className="mt-3 flex items-center gap-1">
                    <Switch checked={item.isAvailable} label={`${item.name} available`} onChange={() => toggle.mutate(item)} />
                    <span className="mr-auto ml-2 text-xs font-semibold text-wine-ink/55">{item.isAvailable ? "On menu" : "Hidden"}</span>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      className="!px-2"
                      aria-label={`Move ${item.name} up`}
                      disabled={!previous || move.isPending}
                      onClick={() => previous && move.mutate({ item, neighbour: previous, direction: -1 })}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      className="!px-2"
                      aria-label={`Move ${item.name} down`}
                      disabled={!next || move.isPending}
                      onClick={() => next && move.mutate({ item, neighbour: next, direction: 1 })}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </AdminButton>
                    <AdminButton size="sm" variant="ghost" className="!px-2" aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                      <Pencil aria-hidden className="size-4" />
                    </AdminButton>
                    <AdminButton size="sm" variant="ghost" className="!px-2" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>
                      <Trash2 aria-hidden className="size-4" />
                    </AdminButton>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add menu item" : `Edit ${editing?.name ?? "item"}`}
        description="Customers see the name, description and photo."
      >
        {editing !== null && (
          <FoodForm
            key={editing === "new" ? "new" : editing.id}
            item={editing === "new" ? undefined : editing}
            categories={categories}
            onDone={() => setEditing(null)}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "item"}`}
        description="It disappears from the customer menu straight away."
        confirmLabel="Delete item"
        pending={remove.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function FoodForm({ item, categories, onDone }: { item?: FoodItemDto; categories: string[]; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: item?.name ?? "",
    category: item?.category ?? categories[0] ?? "",
    description: item?.description ?? "",
    imageUrl: item?.imageUrl ?? "",
    price: item?.price !== null && item?.price !== undefined ? String(item.price) : "",
    sortOrder: item ? String(item.sortOrder) : "",
    isAvailable: item?.isAvailable ?? true,
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = {
    name: form.name.trim().length < 2 ? "At least 2 characters" : null,
    category: form.category.trim().length < 2 ? "Pick or type a category" : null,
    imageUrl: form.imageUrl && !/^(https?:\/\/|\/)/.test(form.imageUrl.trim()) ? "Use an http(s) URL or a path starting with /" : null,
    price: form.price && (Number.isNaN(Number(form.price)) || Number(form.price) < 0) ? "Enter a positive number" : null,
  };
  const valid = Object.values(errors).every((error) => error === null);

  const mutation = useMutation({
    mutationFn: () => {
      const input: UpsertFoodItemInput = {
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        price: form.price ? Number(form.price) : null,
        isAvailable: form.isAvailable,
        ...(form.sortOrder ? { sortOrder: Number(form.sortOrder) } : {}),
      };
      return item ? adminApi.updateFood(item.id, input) : adminApi.createFood(input);
    },
    onSuccess: (saved) => {
      toast({ tone: "success", title: item ? "Item updated" : "Item added", description: saved.name });
      void queryClient.invalidateQueries({ queryKey: adminKeys.food });
      onDone();
    },
  });

  const field = <K extends keyof typeof form>(key: K) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const show = (error: string | null) => (submitted ? error : null);

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (valid) mutation.mutate();
      }}
    >
      <Field label="Name" value={form.name} maxLength={60} onChange={field("name")} error={show(errors.name)} data-autofocus />
      <Field label="Category" value={form.category} maxLength={30} list="food-categories" onChange={field("category")} error={show(errors.category)} />
      <datalist id="food-categories">
        {categories.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>
      <TextAreaField label="Description" value={form.description} maxLength={240} onChange={field("description")} hint={`${form.description.length}/240`} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Image URL" value={form.imageUrl} placeholder="https://…" onChange={field("imageUrl")} error={show(errors.imageUrl)} />
        </div>
        <FoodImage key={form.imageUrl} src={errors.imageUrl ? "" : form.imageUrl.trim()} alt="Preview" size={44} className="rounded-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (₹, hidden)" inputMode="decimal" value={form.price} onChange={field("price")} error={show(errors.price)} />
        <Field label="Sort order" inputMode="numeric" value={form.sortOrder} placeholder="Auto" onChange={field("sortOrder")} hint="Lower shows first" />
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-burgundy/10 px-4 py-3">
        <span className="text-sm font-semibold">Available on the menu</span>
        <Switch checked={form.isAvailable} label="Available on the menu" onChange={(isAvailable) => setForm((current) => ({ ...current, isAvailable }))} />
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
        <AdminButton type="submit" disabled={mutation.isPending}>
          {item ? "Save item" : "Add item"}
        </AdminButton>
      </div>
    </form>
  );
}
