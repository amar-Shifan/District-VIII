import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminRealtime } from "@/components/admin/AdminRealtime";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Sidebar } from "@/components/admin/Sidebar";
import { ToastProvider } from "@/components/admin/Toaster";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · District VIII" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div data-admin-root className="bg-admin-page relative min-h-dvh overflow-x-hidden text-wine-ink">
        <div aria-hidden className="pointer-events-none fixed inset-0 hidden overflow-hidden md:block">
          <span className="absolute -top-32 right-12 size-[28rem] rounded-full bg-burgundy/10 blur-[100px]" />
          <span className="absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-rose-200/35 blur-[110px]" />
        </div>
        <Sidebar />
        <NotificationBell />
        <AdminRealtime />
        <main className="relative z-10 min-h-dvh w-full overflow-x-clip px-4 pt-[calc(env(safe-area-inset-top,0px)+76px)] pb-[calc(env(safe-area-inset-bottom,0px)+104px)] md:ml-[92px] md:mr-4 md:my-4 md:w-auto md:min-h-[calc(100dvh-2rem)] md:max-w-[1600px] md:overflow-y-visible md:rounded-[28px] md:border md:border-white/70 md:bg-white/55 md:px-6 md:py-6 md:shadow-[0_24px_70px_-36px_rgba(74,8,18,0.35)] md:backdrop-blur-2xl md:backdrop-saturate-150 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
