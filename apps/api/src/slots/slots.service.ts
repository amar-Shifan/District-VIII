import {
  type BlockedSlotDto,
  isOperatingSlot,
  SLOT_HOLDING_STATUSES,
} from '@district-viii/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Booking } from '../bookings/booking.schema';
import {
  isDuplicateKeyError,
  toObjectId,
} from '../common/database/mongo-errors';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { UnitsService } from '../units/units.service';
import { BlockedSlot, type BlockedSlotRecord } from './blocked-slot.schema';
import {
  CreateBlockedSlotDto,
  ListBlockedSlotsQueryDto,
  UpdateBlockedSlotDto,
} from './slots.dto';

@Injectable()
export class SlotsService {
  constructor(
    @InjectModel(BlockedSlot.name)
    private readonly blockedSlots: Model<BlockedSlot>,
    @InjectModel(Booking.name) private readonly bookings: Model<Booking>,
    private readonly units: UnitsService,
    private readonly settings: SettingsService,
    private readonly realtime: RealtimeService,
  ) {}

  async list(query: ListBlockedSlotsQueryDto): Promise<BlockedSlotDto[]> {
    const filter: FilterQuery<BlockedSlot> = {};
    if (query.date) filter.businessDate = query.date;
    if (query.unitId) filter.unitId = toObjectId(query.unitId);
    const [rows, names] = await Promise.all([
      this.blockedSlots
        .find(filter)
        .sort({ businessDate: 1, startHour: 1 })
        .limit(500)
        .lean<BlockedSlotRecord[]>()
        .exec(),
      this.units.nameMap(),
    ]);
    return rows.map((row) => toDto(row, names));
  }

  async create(input: CreateBlockedSlotDto): Promise<BlockedSlotDto> {
    const unit = await this.units.getById(input.unitId);
    const settings = await this.settings.get();
    if (!isOperatingSlot(input.startHour, settings)) {
      throw new BadRequestException('That time is outside operating hours');
    }
    const held = await this.bookings
      .exists({
        unitId: unit._id,
        businessDate: input.businessDate,
        startHour: input.startHour,
        status: { $in: SLOT_HOLDING_STATUSES },
      })
      .exec();
    if (held) {
      throw new ConflictException(
        'This slot already has a booking. Cancel or reject it first.',
      );
    }

    try {
      const created = await this.blockedSlots.create({
        ...input,
        unitId: unit._id,
      });
      this.realtime.availabilityChanged({
        unitType: unit.type,
        businessDate: input.businessDate,
      });
      return toDto(
        created.toObject<BlockedSlotRecord>(),
        new Map([[String(unit._id), unit.name]]),
      );
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictException('This slot is already blocked');
      throw error;
    }
  }

  async update(
    id: string,
    input: UpdateBlockedSlotDto,
  ): Promise<BlockedSlotDto> {
    const updated = await this.blockedSlots
      .findByIdAndUpdate(id, { $set: { reason: input.reason } }, { new: true })
      .lean<BlockedSlotRecord>()
      .exec();
    if (!updated) throw new NotFoundException('Blocked slot not found');
    return toDto(updated, await this.units.nameMap());
  }

  async remove(id: string): Promise<void> {
    const removed = await this.blockedSlots
      .findByIdAndDelete(id)
      .lean<BlockedSlotRecord>()
      .exec();
    if (!removed) throw new NotFoundException('Blocked slot not found');
    const unit = await this.units
      .getById(String(removed.unitId))
      .catch(() => null);
    this.realtime.availabilityChanged({
      unitType: unit?.type,
      businessDate: removed.businessDate,
    });
  }
}

function toDto(
  row: BlockedSlotRecord,
  names: Map<string, string>,
): BlockedSlotDto {
  return {
    id: String(row._id),
    unitId: String(row.unitId),
    unitName: names.get(String(row.unitId)) ?? 'Removed unit',
    businessDate: row.businessDate,
    startHour: row.startHour,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}
