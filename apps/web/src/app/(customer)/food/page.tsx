import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const metadata: Metadata = {
  title: "Food & Drinks",
};

export default function FoodPage() {
  return <PlaceholderScreen eyebrow="Kitchen" title="Food & Drinks" description="The full menu is coming soon." />;
}
