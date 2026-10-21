import type { Metadata } from "next";
import { AdminLoginScreen } from "@/features/admin/AdminLoginScreen";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdminLoginScreen />;
}
