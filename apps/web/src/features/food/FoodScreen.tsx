"use client";

import type { PublicFoodItemDto } from "@district-viii/shared";
import { motion } from "framer-motion";
import { SearchX, WifiOff } from "lucide-react";
import { useState } from "react";
import { FoodImage } from "@/components/FoodImage";
import { PillButton } from "@/components/PillButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Shimmer, StateMessage } from "@/components/StateMessage";
import { useFood, useFoodCategories } from "@/hooks/use-live-data";

export function FoodScreen() {
  const food = useFood();
  const categories = useFoodCategories();
  const [category, setCategory] = useState<string | null>(null);

  const items = (food.data ?? []).filter((item) => category === null || item.category === category);
  const chips = [{ name: "All", value: null }, ...(categories.data ?? []).map((c) => ({ name: c.name, value: c.name }))];

  return (
    <div className="relative flex h-full flex-col bg-ink">
      <div aria-hidden className="bg-home-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />
      <ScreenHeader title="Food & Drinks" subtitle="Order at the counter · menu only" />

      <main className="relative flex min-h-0 flex-1 flex-col pt-4 pb-[calc(var(--safe-bottom)+8px)]">
        <div
          role="group"
          aria-label="Filter by category"
          className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]"
        >
          {categories.isPending
            ? [0, 1, 2, 3].map((index) => <Shimmer key={index} className="h-10 w-24 shrink-0 rounded-full" />)
            : chips.map((chip) => {
                const active = chip.value === category;
                return (
                  <button
                    key={chip.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(chip.value)}
                    className={`relative h-10 shrink-0 rounded-full px-5 text-sm font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blush ${
                      active ? "text-burgundy" : "border border-white/15 text-white hover:border-white/30"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="food-chip-active"
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-white shadow-handle"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{chip.name}</span>
                  </button>
                );
              })}
        </div>

        {/* The only vertical scroll on this screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {food.isPending ? (
            <div role="status" aria-label="Loading menu" className="space-y-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <Shimmer key={index} className="h-[108px] rounded-card-sm" />
              ))}
            </div>
          ) : food.isError ? (
            <StateMessage
              tone="error"
              icon={WifiOff}
              title="Menu unavailable"
              description="We couldn't load the menu. Try again in a moment."
              action={
                <PillButton variant="light" onClick={() => void food.refetch()}>
                  Try again
                </PillButton>
              }
            />
          ) : items.length === 0 ? (
            <StateMessage icon={SearchX} title="Nothing here yet" description="This part of the menu is empty right now." />
          ) : (
            <ul className="space-y-3" aria-label={category ? `${category} items` : "All menu items"}>
              {items.map((item, index) => (
                <FoodRow key={item.id} item={item} index={index} />
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function FoodRow({ item, index }: { item: PublicFoodItemDto; index: number }) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card-gradient flex items-center gap-4 rounded-card-sm border border-white/10 p-3 shadow-card"
    >
      <FoodImage src={item.imageUrl} alt={item.name} size={84} className="rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.22em] text-blush uppercase">{item.category}</p>
        <h2 className="mt-0.5 -skew-x-8 font-display text-xl leading-tight text-white">{item.name}</h2>
        {item.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-blush/90">{item.description}</p>}
      </div>
    </motion.li>
  );
}
