import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminRealtime } from "@/components/admin/AdminRealtime";
import { Sidebar } from "@/components/admin/Sidebar";
import { ToastProvider } from "@/components/admin/Toaster";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · District VIII" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div data-admin-root className="bg-admin-page min-h-dvh text-wine-ink">
        <Sidebar />
        <AdminRealtime />
        {/* Offset by the collapsed sidebar; the expanded sidebar overlays instead of pushing. */}
        <main className="mx-auto max-w-[1400px] py-6 pr-4 pl-[92px] sm:py-8 sm:pr-8 sm:pl-[120px]">{children}</main>
      </div>
    </ToastProvider>
  );
}
