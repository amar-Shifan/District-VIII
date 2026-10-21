import type { Metadata } from "next";
import { UnitBookingScreen } from "@/features/booking/UnitBookingScreen";

export const metadata: Metadata = {
  title: "8 Ball Pool",
};

export default function PoolPage() {
  return <UnitBookingScreen type="pool" />;
}
