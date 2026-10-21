import { API_URL, USE_MOCK } from "./config";
import { mockApi } from "./mock-data";
import type { MyBookingStatus, UnitsSummary } from "./types";

/**
 * Typed service layer. Components and hooks only import from here, so moving
 * from the mock to the NestJS API is a config change (see config.ts).
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getUnitsSummary(): Promise<UnitsSummary> {
  return USE_MOCK ? mockApi.getUnitsSummary() : request<UnitsSummary>("/units/summary");
}

export function getMyBookingStatus(): Promise<MyBookingStatus> {
  return USE_MOCK ? mockApi.getMyBookingStatus() : request<MyBookingStatus>("/bookings/me/status");
}
