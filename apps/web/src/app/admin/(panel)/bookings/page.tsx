import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/admin/ui";
import { BookingsScreen } from "@/features/admin/BookingsScreen";

export const metadata: Metadata = {
  title: "Bookings",
};

export default function AdminBookingsPage() {
  // useSearchParams (initial status filter) needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <BookingsScreen />
    </Suspense>
  );
}
