import {
  UNIT_STATUSES,
  UNIT_TYPES,
  type UnitStatus,
  type UnitType,
} from '@district-viii/shared';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Unit {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, enum: UNIT_TYPES })
  type!: UnitType;

  @Prop({ type: String, required: true, enum: UNIT_STATUSES, default: 'free' })
  status!: UnitStatus;

  @Prop({ type: Date, default: null })
  busyUntil!: Date | null;

  @Prop({ required: true, default: true })
  isActive!: boolean;
}

export type UnitDocument = HydratedDocument<Unit>;
export type UnitRecord = Unit & { _id: Types.ObjectId };

export const UnitSchema = SchemaFactory.createForClass(Unit);
UnitSchema.index({ type: 1, name: 1 }, { unique: true });
UnitSchema.index({ status: 1, busyUntil: 1 });
