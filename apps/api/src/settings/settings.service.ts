import {
  ARENA_TIME_ZONE,
  type PublicSettingsDto,
  type SettingsDto,
  slotHours,
} from '@district-viii/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RealtimeService } from '../realtime/realtime.service';
import { DEFAULT_SETTINGS, Settings } from './settings.schema';
import { UpdateSettingsDto } from './settings.dto';

@Injectable()
export class SettingsService {
  /** Settings change rarely; keep the singleton in memory and refresh it on update. */
  private cache: SettingsDto | null = null;

  constructor(
    @InjectModel(Settings.name) private readonly model: Model<Settings>,
    private readonly realtime: RealtimeService,
  ) {}

  async get(): Promise<SettingsDto> {
    if (this.cache) return this.cache;
    const doc = await this.model
      .findOneAndUpdate(
        { key: DEFAULT_SETTINGS.key },
        { $setOnInsert: { ...DEFAULT_SETTINGS } },
        { upsert: true, new: true, lean: true },
      )
      .exec();
    this.cache = toDto(doc);
    return this.cache;
  }

  async getPublic(): Promise<PublicSettingsDto> {
    return { ...(await this.get()), timeZone: ARENA_TIME_ZONE };
  }

  async update(input: UpdateSettingsDto): Promise<SettingsDto> {
    const next = { ...(await this.get()), ...input };
    if (slotHours(next).length === 0) {
      throw new BadRequestException(
        'Operating hours must fit at least one slot of the chosen duration',
      );
    }
    const doc = await this.model
      .findOneAndUpdate(
        { key: DEFAULT_SETTINGS.key },
        { $set: input },
        {
          upsert: true,
          new: true,
          lean: true,
        },
      )
      .exec();
    this.cache = toDto(doc);
    this.realtime.availabilityChanged({});
    return this.cache;
  }

  /** For tests and the seed script. */
  clearCache(): void {
    this.cache = null;
  }
}

function toDto(doc: Settings | null): SettingsDto {
  // Upserts with `new: true` always return a document; guard for the type checker.
  if (!doc) throw new Error('Settings document could not be loaded');
  return {
    arenaName: doc.arenaName,
    openHour: doc.openHour,
    closeHour: doc.closeHour,
    slotDurationHours: doc.slotDurationHours,
    bookingWindowDays: doc.bookingWindowDays,
  };
}
