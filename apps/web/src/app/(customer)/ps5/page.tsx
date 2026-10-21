import type { Metadata } from "next";
import { UnitBookingScreen } from "@/features/booking/UnitBookingScreen";

export const metadata: Metadata = {
  title: "PS5 Stations",
};

export default function Ps5Page() {
  return <UnitBookingScreen type="ps5" />;
}
