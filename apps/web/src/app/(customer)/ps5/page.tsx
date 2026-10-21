import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const metadata: Metadata = {
  title: "PS5 Stations",
};

export default function Ps5Page() {
  return <PlaceholderScreen eyebrow="Book a console" title="PS5 Stations" description="Console booking is coming soon." />;
}
