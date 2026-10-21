import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const DEFAULT_SETTINGS = {
  key: 'global',
  arenaName: 'District VIII',
  openHour: 12,
  closeHour: 4,
  slotDurationHours: 1,
  bookingWindowDays: 3,
} as const;

/** Singleton document, addressed by `key: "global"`. */
@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({ required: true, unique: true, default: DEFAULT_SETTINGS.key })
  key!: string;

  @Prop({ required: true, trim: true, default: DEFAULT_SETTINGS.arenaName })
  arenaName!: string;

  @Prop({ required: true, min: 0, max: 23, default: DEFAULT_SETTINGS.openHour })
  openHour!: number;

  @Prop({
    required: true,
    min: 0,
    max: 23,
    default: DEFAULT_SETTINGS.closeHour,
  })
  closeHour!: number;

  @Prop({
    required: true,
    min: 1,
    max: 4,
    default: DEFAULT_SETTINGS.slotDurationHours,
  })
  slotDurationHours!: number;

  @Prop({
    required: true,
    min: 1,
    max: 14,
    default: DEFAULT_SETTINGS.bookingWindowDays,
  })
  bookingWindowDays!: number;
}

export type SettingsDocument = HydratedDocument<Settings>;
export const SettingsSchema = SchemaFactory.createForClass(Settings);
