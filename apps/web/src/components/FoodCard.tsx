import { UtensilsCrossed } from "lucide-react";
import { HomeCard } from "./HomeCard";

export function FoodCard({ href }: { href: string }) {
  return (
    <HomeCard
      href={href}
      ariaLabel="Kitchen: Food & Drinks. Menu, snacks and shakes. View menu."
      label="Kitchen"
      decoration={<UtensilsCrossed strokeWidth={1.25} className="size-full" />}
    >
      <p className="-skew-x-8 font-display text-[clamp(2rem,22cqh,3.5rem)] leading-none text-white">Food &amp; Drinks</p>
      <p className="mt-2 text-sm font-medium text-blush">Menu, snacks &amp; shakes</p>
      <span
        aria-hidden
        className="mt-3 inline-flex w-fit items-center rounded-full bg-white px-4 py-2 text-xs font-bold tracking-[0.14em] text-burgundy uppercase"
      >
        View menu
      </span>
    </HomeCard>
  );
}
