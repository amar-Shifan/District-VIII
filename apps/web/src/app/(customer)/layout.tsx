import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

/** Every customer-facing screen lives inside the phone-style shell. Admin routes will sit outside this group. */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
