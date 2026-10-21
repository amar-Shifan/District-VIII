import type { Metadata } from "next";
import { FoodScreen } from "@/features/food/FoodScreen";

export const metadata: Metadata = {
  title: "Food & Drinks",
};

export default function FoodPage() {
  return <FoodScreen />;
}
