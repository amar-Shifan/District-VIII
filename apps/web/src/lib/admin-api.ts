"use client";

import type {
  AdminDto,
  AvailabilityDto,
  BlockedSlotDto,
  BookingDto,
  BookingListQuery,
  BookingsPerDayPoint,
  CreateBlockedSlotInput,
  CreateBookingInput,
  CreateUnitInput,
  DashboardStatsDto,
  DailyEstimatedSalesDto,
  FoodItemDto,
  IsoDate,
  Paginated,
  PeakHourPoint,
  SettingsDto,
  StatusSplitPoint,
  UnitDto,
  UnitType,
  UpdateSettingsInput,
  UpdateUnitInput,
  UpdateUnitStatusInput,
  UpsertFoodItemInput,
  UsageByTypePoint,
} from "@district-viii/shared";
import { ADMIN_REQUEST_HEADER } from "./admin-session";
import { ApiError, isApiErrorBody } from "./api-error";

export interface AdminLiveResponse {
  revision: number;
  newRequests: BookingDto[];
  serverTime: string;
}

export interface AdminNotificationDto {
  id: string;
  title: string;
  message: string;
  bookingId: string;
  booking: {
    customerName: string;
    unitName: string;
    unitType: UnitType;
    businessDate: string;
    startHour: number;
    durationHours: number;
    status: string;
  };
  createdAt: string;
  isRead: boolean;
}

export interface AdminNotificationsResponse {
  items: AdminNotificationDto[];
  unreadCount: number;
}

export interface AdminPushSubscriptionInput {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

/** Admin calls go to this app's /api routes; the httpOnly session cookie travels automatically. */
async function adminRequest<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const method = init?.method ?? "GET";
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      Accept: "application/json",
      [ADMIN_REQUEST_HEADER]: "1",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  if (response.status === 401) {
    // Session expired or revoked: clear the cookie and go back to the login page, then here again.
    // A full page load (not router.push) so proxy.ts re-checks the cleared cookie.
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    const login = new URL("/admin/login", window.location.origin);
    login.searchParams.set("next", window.location.pathname);
    window.location.replace(login.href);
    throw new ApiError(401, "Your session has expired");
  }
  const text = response.status === 204 ? "" : await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const body = isApiErrorBody(data) ? data : undefined;
    throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`, body);
  }
  return data as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const adminApi = {
  me: () => adminRequest<AdminDto>("/auth/me"),
  live: (since?: string) => adminRequest<AdminLiveResponse>(`/admin/live${query({ since })}`),
  notifications: () => adminRequest<AdminNotificationsResponse>("/admin/notifications"),
  markNotificationRead: (id: string) =>
    adminRequest<void>("/admin/notifications", { method: "PATCH", body: { id } }),
  markAllNotificationsRead: () =>
    adminRequest<void>("/admin/notifications", { method: "PATCH", body: { all: true } }),
  pushConfig: () => adminRequest<{ vapidPublicKey: string | null }>("/admin/push-subscriptions"),
  savePushSubscription: (subscription: AdminPushSubscriptionInput) =>
    adminRequest<void>("/admin/push-subscriptions", { method: "POST", body: subscription }),
  removePushSubscription: (endpoint: string) =>
    adminRequest<void>("/admin/push-subscriptions", { method: "DELETE", body: { endpoint } }),

  // Dashboard
  stats: () => adminRequest<DashboardStatsDto>("/admin/dashboard/stats"),
  estimatedSalesLastSevenDays: () => adminRequest<DailyEstimatedSalesDto[]>("/admin/dashboard/estimated-sales"),
  bookingsPerDay: (days = 7) => adminRequest<BookingsPerDayPoint[]>(`/admin/dashboard/bookings-per-day?days=${days}`),
  peakHours: (days = 30) => adminRequest<PeakHourPoint[]>(`/admin/dashboard/peak-hours?days=${days}`),
  usageByType: (days = 30) => adminRequest<UsageByTypePoint[]>(`/admin/dashboard/usage-by-type?days=${days}`),
  statusSplit: (days = 30) => adminRequest<StatusSplitPoint[]>(`/admin/dashboard/status-split?days=${days}`),

  // Bookings
  bookings: (filters: BookingListQuery) =>
    adminRequest<Paginated<BookingDto>>(`/bookings${query({ ...filters })}`),
  approve: (id: string) => adminRequest<BookingDto>(`/bookings/${id}/approve`, { method: "PATCH" }),
  reject: (id: string, reason?: string) =>
    adminRequest<BookingDto>(`/bookings/${id}/reject`, { method: "PATCH", body: reason ? { reason } : {} }),
  cancel: (id: string) => adminRequest<BookingDto>(`/bookings/${id}/cancel`, { method: "PATCH", body: {} }),
  createWalkIn: (input: CreateBookingInput) =>
    adminRequest<BookingDto>("/bookings/admin", { method: "POST", body: input }),

  // Units
  units: () => adminRequest<UnitDto[]>("/admin/units"),
  createUnit: (input: CreateUnitInput) => adminRequest<UnitDto>("/units", { method: "POST", body: input }),
  updateUnit: (id: string, input: UpdateUnitInput) =>
    adminRequest<UnitDto>(`/units/${id}`, { method: "PATCH", body: input }),
  updateUnitStatus: (id: string, input: UpdateUnitStatusInput) =>
    adminRequest<UnitDto>(`/units/${id}/status`, { method: "PATCH", body: input }),
  deleteUnit: (id: string) => adminRequest<void>(`/units/${id}`, { method: "DELETE" }),

  // Availability and blocked slots
  availability: (type: UnitType, date: IsoDate) =>
    adminRequest<AvailabilityDto>(`/availability${query({ type, date })}`),
  blockedSlots: (date?: IsoDate, unitId?: string) =>
    adminRequest<BlockedSlotDto[]>(`/admin/slots${query({ date, unitId })}`),
  blockSlot: (input: CreateBlockedSlotInput) =>
    adminRequest<BlockedSlotDto>("/admin/slots", { method: "POST", body: input }),
  updateBlockedSlot: (id: string, reason: string) =>
    adminRequest<BlockedSlotDto>(`/admin/slots/${id}`, { method: "PATCH", body: { reason } }),
  unblockSlot: (id: string) => adminRequest<void>(`/admin/slots/${id}`, { method: "DELETE" }),

  // Settings
  settings: () => adminRequest<SettingsDto>("/admin/settings"),
  updateSettings: (input: UpdateSettingsInput) =>
    adminRequest<SettingsDto>("/admin/settings", { method: "PUT", body: input }),

  // Food
  food: () => adminRequest<FoodItemDto[]>("/admin/food"),
  createFood: (input: UpsertFoodItemInput) => adminRequest<FoodItemDto>("/admin/food", { method: "POST", body: input }),
  updateFood: (id: string, input: Partial<UpsertFoodItemInput>) =>
    adminRequest<FoodItemDto>(`/admin/food/${id}`, { method: "PATCH", body: input }),
  toggleFood: (id: string) => adminRequest<FoodItemDto>(`/admin/food/${id}/toggle`, { method: "PATCH" }),
  deleteFood: (id: string) => adminRequest<void>(`/admin/food/${id}`, { method: "DELETE" }),
};

export const adminKeys = {
  all: ["admin"] as const,
  me: ["admin", "me"] as const,
  notifications: ["admin", "notifications"] as const,
  pushConfig: ["admin", "push-config"] as const,
  stats: ["admin", "dashboard", "stats"] as const,
  charts: ["admin", "dashboard", "charts"] as const,
  bookings: (filters: BookingListQuery) => ["admin", "bookings", filters] as const,
  bookingsAll: ["admin", "bookings"] as const,
  units: ["admin", "units"] as const,
  availability: (type: UnitType, date: IsoDate) => ["admin", "availability", type, date] as const,
  availabilityAll: ["admin", "availability"] as const,
  blockedSlots: (date: IsoDate) => ["admin", "slots", date] as const,
  blockedSlotsAll: ["admin", "slots"] as const,
  settings: ["admin", "settings"] as const,
  food: ["admin", "food"] as const,
};
