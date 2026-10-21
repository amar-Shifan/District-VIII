import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const metadata: Metadata = {
  title: "My Booking",
};

export default function MyBookingPage() {
  return <PlaceholderScreen eyebrow="Your session" title="My Booking" description="Booking details are coming soon." />;
}
