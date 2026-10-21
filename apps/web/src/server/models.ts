import "server-only";

import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  type BookingSource,
  type BookingStatus,
  SLOT_HOLDING_STATUSES,
  UNIT_STATUSES,
  UNIT_TYPES,
  type UnitStatus,
  type UnitType,
} from "@district-viii/shared";
import mongoose, { type Model, Schema, type Types } from "mongoose";

/** Reuses compiled models across hot reloads and warm serverless invocations. */
function defineModel<T>(name: string, schema: Schema<T>, collection?: string): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection);
}

type Timestamps = { createdAt: Date; updatedAt: Date };

// ---------- Unit ----------

export interface Unit {
  name: string;
  type: UnitType;
  status: UnitStatus;
  busyUntil: Date | null;
  isActive: boolean;
}
export type UnitRecord = Unit & { _id: Types.ObjectId } & Timestamps;

const UnitSchema = new Schema<Unit>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: UNIT_TYPES },
    status: { type: String, required: true, enum: UNIT_STATUSES, default: "free" },
    busyUntil: { type: Date, default: null },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);
UnitSchema.index({ type: 1, name: 1 }, { unique: true });
UnitSchema.index({ status: 1, busyUntil: 1 });
export const UnitModel = defineModel("Unit", UnitSchema);

// ---------- Booking ----------

export interface Booking {
  unitId: Types.ObjectId;
  unitType: UnitType;
  /** Business session date (YYYY-MM-DD, Asia/Kolkata). 1 AM slots belong to the previous day. */
  businessDate: string;
  /** Real clock hour the slot starts at, 0 to 23. */
  startHour: number;
  durationHours: number;
  /** Absolute start instant, denormalized for sorting and range queries. */
  startsAt: Date;
  customerName: string;
  /** Canonical 10-digit Indian mobile number. */
  customerPhone: string;
  status: BookingStatus;
  source: BookingSource;
  rejectionReason: string | null;
  approvedAt: Date | null;
}
export type BookingRecord = Booking & { _id: Types.ObjectId } & Timestamps;

const BookingSchema = new Schema<Booking>(
  {
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    unitType: { type: String, required: true, enum: UNIT_TYPES },
    businessDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    durationHours: { type: Number, required: true, min: 1, max: 4, default: 1 },
    startsAt: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    customerPhone: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    status: { type: String, required: true, enum: BOOKING_STATUSES, default: "pending" },
    source: { type: String, required: true, enum: BOOKING_SOURCES, default: "online" },
    rejectionReason: { type: String, default: null, maxlength: 200 },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * Double-booking guard: at most one pending or approved booking per unit and
 * slot, enforced by MongoDB itself so it holds under concurrent requests.
 * Rejected and cancelled bookings fall outside the partial filter and free the slot.
 */
export const SLOT_UNIQUE_INDEX = "unique_active_booking_per_slot";
BookingSchema.index(
  { unitId: 1, businessDate: 1, startHour: 1 },
  {
    name: SLOT_UNIQUE_INDEX,
    unique: true,
    partialFilterExpression: { status: { $in: [...SLOT_HOLDING_STATUSES] } },
  },
);
BookingSchema.index({ businessDate: 1, status: 1 });
BookingSchema.index({ customerPhone: 1, startsAt: -1 });
BookingSchema.index({ status: 1, createdAt: -1 });
export const BookingModel = defineModel("Booking", BookingSchema);

// ---------- Blocked slot ----------

/** An hour an admin has taken out of the booking grid (tournament, private event, repairs...). */
export interface BlockedSlot {
  unitId: Types.ObjectId;
  businessDate: string;
  startHour: number;
  reason: string;
}
export type BlockedSlotRecord = BlockedSlot & { _id: Types.ObjectId } & Timestamps;

const BlockedSlotSchema = new Schema<BlockedSlot>(
  {
    unitId: { type: Schema.Types.ObjectId, ref: "Unit", required: true },
    businessDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);
BlockedSlotSchema.index({ unitId: 1, businessDate: 1, startHour: 1 }, { unique: true });
BlockedSlotSchema.index({ businessDate: 1 });
export const BlockedSlotModel = defineModel("BlockedSlot", BlockedSlotSchema);

// ---------- Food ----------

export interface FoodItem {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  /** Stored for later; never sent to customers for now. */
  price: number | null;
  isAvailable: boolean;
  sortOrder: number;
}
export type FoodItemRecord = FoodItem & { _id: Types.ObjectId } & Timestamps;

const FoodItemSchema = new Schema<FoodItem>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    category: { type: String, required: true, trim: true, maxlength: 30 },
    description: { type: String, trim: true, default: "", maxlength: 240 },
    imageUrl: { type: String, trim: true, default: "" },
    price: { type: Number, default: null, min: 0 },
    isAvailable: { type: Boolean, required: true, default: true },
    sortOrder: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);
FoodItemSchema.index({ isAvailable: 1, category: 1, sortOrder: 1 });
export const FoodItemModel = defineModel("FoodItem", FoodItemSchema, "fooditems");

// ---------- Settings (singleton) ----------

export const DEFAULT_SETTINGS = {
  key: "global",
  arenaName: "District VIII",
  openHour: 12,
  closeHour: 4,
  slotDurationHours: 1,
  bookingWindowDays: 3,
} as const;

export interface Settings {
  key: string;
  arenaName: string;
  openHour: number;
  closeHour: number;
  slotDurationHours: number;
  bookingWindowDays: number;
}

const SettingsSchema = new Schema<Settings>(
  {
    key: { type: String, required: true, unique: true, default: DEFAULT_SETTINGS.key },
    arenaName: { type: String, required: true, trim: true, default: DEFAULT_SETTINGS.arenaName },
    openHour: { type: Number, required: true, min: 0, max: 23, default: DEFAULT_SETTINGS.openHour },
    closeHour: { type: Number, required: true, min: 0, max: 23, default: DEFAULT_SETTINGS.closeHour },
    slotDurationHours: { type: Number, required: true, min: 1, max: 4, default: DEFAULT_SETTINGS.slotDurationHours },
    bookingWindowDays: { type: Number, required: true, min: 1, max: 14, default: DEFAULT_SETTINGS.bookingWindowDays },
  },
  { timestamps: true },
);
export const SettingsModel = defineModel("Settings", SettingsSchema, "settings");

// ---------- Admin ----------

export interface Admin {
  email: string;
  passwordHash: string;
  name: string;
}
export type AdminRecord = Admin & { _id: Types.ObjectId };

const AdminSchema = new Schema<Admin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);
export const AdminModel = defineModel("Admin", AdminSchema);

// ---------- Live revision ----------

/**
 * A counter bumped on every change. Clients poll it (cheap) and refetch only
 * when it moves: the serverless replacement for socket.io events.
 */
export interface LiveState {
  _id: string;
  revision: number;
}

const LiveStateSchema = new Schema<LiveState>(
  { _id: { type: String }, revision: { type: Number, required: true, default: 0 } },
  { timestamps: true, collection: "live" },
);
export const LiveStateModel = defineModel("LiveState", LiveStateSchema);

export const ALL_MODELS: Model<never>[] = [
  UnitModel,
  BookingModel,
  BlockedSlotModel,
  FoodItemModel,
  SettingsModel,
  AdminModel,
  LiveStateModel,
] as unknown as Model<never>[];
