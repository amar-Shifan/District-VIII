import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

/** An hour an admin has taken out of the booking grid (tournament, private event, repairs...). */
@Schema({ timestamps: true })
export class BlockedSlot {
  @Prop({ type: Types.ObjectId, ref: 'Unit', required: true })
  unitId!: Types.ObjectId;

  @Prop({ required: true, match: /^\d{4}-\d{2}-\d{2}$/ })
  businessDate!: string;

  @Prop({ required: true, min: 0, max: 23 })
  startHour!: number;

  @Prop({ required: true, trim: true, maxlength: 200 })
  reason!: string;
}

export type BlockedSlotDocument = HydratedDocument<BlockedSlot>;
export type BlockedSlotRecord = BlockedSlot & {
  _id: Types.ObjectId;
  createdAt: Date;
};

export const BlockedSlotSchema = SchemaFactory.createForClass(BlockedSlot);
BlockedSlotSchema.index(
  { unitId: 1, businessDate: 1, startHour: 1 },
  { unique: true },
);
BlockedSlotSchema.index({ businessDate: 1 });
