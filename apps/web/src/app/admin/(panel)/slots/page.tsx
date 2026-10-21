import type { Metadata } from "next";
import { SlotsScreen } from "@/features/admin/SlotsScreen";

export const metadata: Metadata = {
  title: "Slots",
};

export default function AdminSlotsPage() {
  return <SlotsScreen />;
}
