import type { Metadata } from "next";
import { MyBookingScreen } from "@/features/my-booking/MyBookingScreen";

export const metadata: Metadata = {
  title: "My Booking",
};

export default function MyBookingPage() {
  return <MyBookingScreen />;
}
