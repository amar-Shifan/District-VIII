import type { IsoDate, UnitType } from "@district-viii/shared";

export const queryKeys = {
  live: ["live"] as const,
  unitsSummary: ["units", "summary"] as const,
  availabilityAll: ["availability"] as const,
  availability: (type: UnitType, date: IsoDate) => ["availability", type, date] as const,
  myBookingsAll: ["bookings", "by-phone"] as const,
  myBookings: (phone: string) => ["bookings", "by-phone", phone] as const,
  myBookingStatus: (phone: string | null) => ["bookings", "by-phone", phone, "status"] as const,
  food: ["food", "items"] as const,
  foodCategories: ["food", "categories"] as const,
  publicSettings: ["settings", "public"] as const,
};
