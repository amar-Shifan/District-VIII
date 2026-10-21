import type {
  AvailabilityDto,
  BookingDto,
  CreateBookingInput,
  FoodCategoryDto,
  IsoDate,
  PublicFoodItemDto,
  PublicSettingsDto,
  UnitType,
  UnitsSummaryDto,
} from "@district-viii/shared";
import { ApiError, isApiErrorBody } from "./api-error";
import { API_BASE, USE_MOCK } from "./config";
import { mockApi } from "./mock-data";

/**
 * Typed service layer for the customer app. Components and hooks only import
 * from here, so the mock and the NestJS API are interchangeable (config.ts).
 */

export { ApiError } from "./api-error";

export async function request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach District VIII right now. Check your connection.");
  }

  const text = await response.text();
  const data: unknown = text ? JSON.parse(text) : undefined;
  if (!response.ok) {
    const body = isApiErrorBody(data) ? data : undefined;
    throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`, body);
  }
  return data as T;
}

export function getUnitsSummary(): Promise<UnitsSummaryDto> {
  return USE_MOCK ? mockApi.getUnitsSummary() : request("/units/summary");
}

export function getAvailability(type: UnitType, date: IsoDate): Promise<AvailabilityDto> {
  return USE_MOCK
    ? mockApi.getAvailability(type, date)
    : request(`/availability?type=${type}&date=${encodeURIComponent(date)}`);
}

export function createBooking(input: CreateBookingInput): Promise<BookingDto> {
  return USE_MOCK ? mockApi.createBooking(input) : request("/bookings", { method: "POST", body: input });
}

export function getBookingsByPhone(phone: string): Promise<BookingDto[]> {
  return USE_MOCK ? mockApi.getBookingsByPhone(phone) : request(`/bookings/by-phone/${encodeURIComponent(phone)}`);
}

export function cancelBooking(id: string, phone: string): Promise<BookingDto> {
  return USE_MOCK
    ? mockApi.cancelBooking(id, phone)
    : request(`/bookings/${id}/cancel`, { method: "PATCH", body: { phone } });
}

export function getFood(): Promise<PublicFoodItemDto[]> {
  return USE_MOCK ? mockApi.getFood() : request("/food");
}

export function getFoodCategories(): Promise<FoodCategoryDto[]> {
  return USE_MOCK ? mockApi.getFoodCategories() : request("/food/categories");
}

export function getPublicSettings(): Promise<PublicSettingsDto> {
  return USE_MOCK ? mockApi.getPublicSettings() : request("/settings/public");
}

export function getLiveRevision(): Promise<{ revision: number }> {
  return request("/live");
}

/** Whether the remembered customer has a booking awaiting approval. */
export async function getMyBookingStatus(phone: string | null): Promise<{ hasPending: boolean }> {
  if (!phone) return { hasPending: false };
  const bookings = await getBookingsByPhone(phone);
  return { hasPending: bookings.some((booking) => booking.status === "pending") };
}
