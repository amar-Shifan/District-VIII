import {
  BOOKING_SOURCES,
  BOOKING_STATUSES,
  type BookingSource,
  type BookingStatus,
  SLOT_HOLDING_STATUSES,
  UNIT_TYPES,
  type UnitType,
} from '@district-viii/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unitId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: UNIT_TYPES })
  unitType!: UnitType;

  /** Business session date (YYYY-MM-DD, Asia/Kolkata). 1 AM slots belong to the previous day. */
  @Prop({ required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  businessDate!: string;

  /** Real clock hour the slot starts at, 0 to 23. */
  @Prop({ required: true, min: 0, max: 23 })
  startHour!: number;

  @Prop({ required: true, min: 1, max: 4, default: 1 })
  durationHours!: number;

  /** Absolute start instant, denormalized for sorting and range queries. */
  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 60 })
  customerName!: string;

  /** Canonical 10-digit Indian mobile number. */
  @Prop({ required: true, match: /^[6-9]\d{9}$/ })
  customerPhone!: string;

  @Prop({
    type: String,
    required: true,
    enum: BOOKING_STATUSES,
    default: 'pending',
  })
  status!: BookingStatus;

  @Prop({
    type: String,
    required: true,
    enum: BOOKING_SOURCES,
    default: 'online',
  })
  source!: BookingSource;

  @Prop({ type: String, default: null, maxlength: 200 })
  rejectionReason!: string | null;

  @Prop({ type: Date, default: null })
  approvedAt!: Date | null;
}

export type BookingDocument = HydratedDocument<Booking>;
export type BookingRecord = Booking & {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const BookingSchema = SchemaFactory.createForClass(Booking);

/**
 * Double-booking guard: at most one pending or approved booking per unit and
 * slot. Enforced by MongoDB itself, so it holds under concurrent requests.
 * Rejected and cancelled bookings fall outside the partial filter and free the slot.
 */
export const SLOT_UNIQUE_INDEX = 'unique_active_booking_per_slot';
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
