import type { Metadata } from "next";
import { UnitsScreen } from "@/features/admin/UnitsScreen";

export const metadata: Metadata = {
  title: "Units",
};

export default function AdminUnitsPage() {
  return <UnitsScreen />;
}
