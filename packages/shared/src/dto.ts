import type { BookingSource, BookingStatus, SlotState, UnitStatus, UnitType } from "./enums";

/** "YYYY-MM-DD" business date in Asia/Kolkata. */
export type IsoDate = string;
/** ISO 8601 timestamp. */
export type IsoDateTime = string;

// ---------- Units ----------

export interface UnitDto {
  id: string;
  name: string;
  type: UnitType;
  status: UnitStatus;
  busyUntil: IsoDateTime | null;
  isActive: boolean;
}

export interface CreateUnitInput {
  name: string;
  type: UnitType;
  isActive?: boolean;
}

export interface UpdateUnitInput {
  name?: string;
  isActive?: boolean;
}

export interface UpdateUnitStatusInput {
  status: UnitStatus;
  /** Required when status is "busy". */
  busyUntil?: IsoDateTime;
}

export interface UnitAvailabilitySummary {
  total: number;
  free: number;
  /** Earliest moment a unit of this type frees up. Present when `free` is 0. */
  nextFreeAt?: IsoDateTime;
}

export type UnitsSummaryDto = Record<UnitType, UnitAvailabilitySummary>;

// ---------- Availability ----------

export interface SlotDto {
  startHour: number;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  state: SlotState;
}

export interface UnitSlotsDto {
  unit: UnitDto;
  slots: SlotDto[];
}

export interface AvailabilityDto {
  type: UnitType;
  date: IsoDate;
  hours: number[];
  units: UnitSlotsDto[];
  generatedAt: IsoDateTime;
}

// ---------- Bookings ----------

export interface BookingDto {
  id: string;
  unitId: string;
  unitName: string;
  unitType: UnitType;
  businessDate: IsoDate;
  startHour: number;
  durationHours: number;
  startsAt: IsoDateTime;
  endsAt: IsoDateTime;
  customerName: string;
  customerPhone: string;
  status: BookingStatus;
  source: BookingSource;
  rejectionReason: string | null;
  approvedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateBookingInput {
  unitId: string;
  businessDate: IsoDate;
  startHour: number;
  customerName: string;
  customerPhone: string;
}

export interface CancelBookingInput {
  /** Required for customers; admins cancel with their token instead. */
  phone?: string;
}

export interface RejectBookingInput {
  reason?: string;
}

export const BOOKING_SORT_FIELDS = ["createdAt", "businessDate", "startHour", "customerName", "status"] as const;
export type BookingSortField = (typeof BOOKING_SORT_FIELDS)[number];

export interface BookingListQuery {
  status?: BookingStatus;
  type?: UnitType;
  from?: IsoDate;
  to?: IsoDate;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: BookingSortField;
  order?: "asc" | "desc";
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Blocked slots ----------

export interface BlockedSlotDto {
  id: string;
  unitId: string;
  unitName: string;
  businessDate: IsoDate;
  startHour: number;
  reason: string;
  createdAt: IsoDateTime;
}

export interface CreateBlockedSlotInput {
  unitId: string;
  businessDate: IsoDate;
  startHour: number;
  reason: string;
}

export interface UpdateBlockedSlotInput {
  reason: string;
}

// ---------- Food ----------

export interface FoodItemDto {
  id: string;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number | null;
  isAvailable: boolean;
  sortOrder: number;
}

/** Customer-facing menu item: prices are hidden for now. */
export type PublicFoodItemDto = Omit<FoodItemDto, "price" | "isAvailable">;

export interface FoodCategoryDto {
  name: string;
  count: number;
}

export interface UpsertFoodItemInput {
  name: string;
  category: string;
  description?: string;
  imageUrl?: string;
  price?: number | null;
  isAvailable?: boolean;
  sortOrder?: number;
}

// ---------- Settings ----------

export interface OperatingHours {
  /** Opening hour, 0 to 23, Asia/Kolkata. */
  openHour: number;
  /** Closing hour, 0 to 23. Less than or equal to openHour means the session runs past midnight. */
  closeHour: number;
  slotDurationHours: number;
}

export interface SettingsDto extends OperatingHours {
  arenaName: string;
  bookingWindowDays: number;
}

export interface PublicSettingsDto extends SettingsDto {
  timeZone: string;
}

export type UpdateSettingsInput = Partial<SettingsDto>;

// ---------- Auth ----------

export interface AdminDto {
  id: string;
  email: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  /** Seconds until the token expires. */
  expiresIn: number;
  admin: AdminDto;
}

export interface SocketTokenResponse {
  token: string;
  expiresIn: number;
}

// ---------- Dashboard ----------

export interface DashboardStatsDto {
  todayBookings: number;
  pendingCount: number;
  approvedToday: number;
  unitsInUse: number;
  totalUnits: number;
}

export interface BookingsPerDayPoint {
  date: IsoDate;
  total: number;
  approved: number;
  pending: number;
}

export interface PeakHourPoint {
  hour: number;
  count: number;
}

export interface UsageByTypePoint {
  type: UnitType;
  count: number;
}

export interface StatusSplitPoint {
  status: BookingStatus;
  count: number;
}

// ---------- Errors ----------

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: IsoDateTime;
}
