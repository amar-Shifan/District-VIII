import type { Metadata } from "next";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export const metadata: Metadata = {
  title: "8 Ball Pool",
};

export default function PoolPage() {
  return <PlaceholderScreen eyebrow="Book a table" title="8 Ball Pool" description="Table booking is coming soon." />;
}
