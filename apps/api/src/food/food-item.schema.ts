import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'fooditems' })
export class FoodItem {
  @Prop({ required: true, trim: true, maxlength: 60 })
  name!: string;

  @Prop({ required: true, trim: true, maxlength: 30 })
  category!: string;

  @Prop({ trim: true, default: '', maxlength: 240 })
  description!: string;

  @Prop({ trim: true, default: '' })
  imageUrl!: string;

  /** Stored for later; never sent to customers for now. */
  @Prop({ type: Number, default: null, min: 0 })
  price!: number | null;

  @Prop({ required: true, default: true })
  isAvailable!: boolean;

  @Prop({ required: true, default: 0 })
  sortOrder!: number;
}

export type FoodItemDocument = HydratedDocument<FoodItem>;
export type FoodItemRecord = FoodItem & { _id: Types.ObjectId };

export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);
FoodItemSchema.index({ isAvailable: 1, category: 1, sortOrder: 1 });
