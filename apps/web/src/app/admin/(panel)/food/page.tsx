import type { Metadata } from "next";
import { FoodAdminScreen } from "@/features/admin/FoodAdminScreen";

export const metadata: Metadata = {
  title: "Food",
};

export default function AdminFoodPage() {
  return <FoodAdminScreen />;
}
