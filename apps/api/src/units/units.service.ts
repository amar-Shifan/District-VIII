import {
  HOUR_MS,
  SLOT_HOLDING_STATUSES,
  type UnitDto,
  type UnitType,
} from '@district-viii/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClockService } from '../common/clock/clock.service';
import {
  isDuplicateKeyError,
  toObjectId,
} from '../common/database/mongo-errors';
import { RealtimeService } from '../realtime/realtime.service';
import { Booking } from '../bookings/booking.schema';
import { BlockedSlot } from '../slots/blocked-slot.schema';
import { toUnitDto } from './unit.mapper';
import { Unit, type UnitRecord } from './unit.schema';
import { CreateUnitDto, UpdateUnitDto, UpdateUnitStatusDto } from './units.dto';

const MAX_BUSY_HOURS = 24;
/** Natural sort, so "Table 10" comes after "Table 2". */
const NAME_COLLATION = { locale: 'en', numericOrdering: true };

@Injectable()
export class UnitsService {
  private readonly logger = new Logger(UnitsService.name);

  constructor(
    @InjectModel(Unit.name) private readonly units: Model<Unit>,
    @InjectModel(Booking.name) private readonly bookings: Model<Booking>,
    @InjectModel(BlockedSlot.name)
    private readonly blockedSlots: Model<BlockedSlot>,
    private readonly clock: ClockService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Active units, optionally of one type, in display order. */
  async findActive(type?: UnitType): Promise<UnitRecord[]> {
    return this.units
      .find({ isActive: true, ...(type ? { type } : {}) })
      .sort({ type: 1, name: 1 })
      .collation(NAME_COLLATION)
      .lean<UnitRecord[]>()
      .exec();
  }

  async findAll(): Promise<UnitRecord[]> {
    return this.units
      .find()
      .sort({ type: 1, name: 1 })
      .collation(NAME_COLLATION)
      .lean<UnitRecord[]>()
      .exec();
  }

  async listPublic(): Promise<UnitDto[]> {
    const now = this.clock.now();
    return (await this.findActive()).map((unit) => toUnitDto(unit, now));
  }

  async listAll(): Promise<UnitDto[]> {
    const now = this.clock.now();
    return (await this.findAll()).map((unit) => toUnitDto(unit, now));
  }

  async getById(id: string): Promise<UnitRecord> {
    const unit = await this.units.findById(id).lean<UnitRecord>().exec();
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async nameMap(): Promise<Map<string, string>> {
    const units = await this.units
      .find({}, { name: 1 })
      .lean<UnitRecord[]>()
      .exec();
    return new Map(units.map((unit) => [String(unit._id), unit.name]));
  }

  async create(input: CreateUnitDto): Promise<UnitDto> {
    try {
      const created = await this.units.create({
        ...input,
        status: 'free',
        busyUntil: null,
      });
      return this.publish(created.toObject<UnitRecord>());
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          `A ${input.type} unit named "${input.name}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateUnitDto): Promise<UnitDto> {
    try {
      const updated = await this.units
        .findByIdAndUpdate(
          id,
          { $set: input },
          { new: true, runValidators: true },
        )
        .lean<UnitRecord>()
        .exec();
      if (!updated) throw new NotFoundException('Unit not found');
      return this.publish(updated);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(
          'Another unit of this type already has that name',
        );
      }
      throw error;
    }
  }

  async updateStatus(id: string, input: UpdateUnitStatusDto): Promise<UnitDto> {
    const now = this.clock.now();
    let busyUntil: Date | null = null;
    if (input.status === 'busy') {
      busyUntil = new Date(input.busyUntil ?? '');
      if (Number.isNaN(busyUntil.getTime()) || busyUntil <= now) {
        throw new BadRequestException('busyUntil must be in the future');
      }
      if (busyUntil.getTime() - now.getTime() > MAX_BUSY_HOURS * HOUR_MS) {
        throw new BadRequestException(
          `busyUntil must be within ${MAX_BUSY_HOURS} hours`,
        );
      }
    }
    const updated = await this.units
      .findByIdAndUpdate(
        id,
        { $set: { status: input.status, busyUntil } },
        { new: true },
      )
      .lean<UnitRecord>()
      .exec();
    if (!updated) throw new NotFoundException('Unit not found');
    return this.publish(updated);
  }

  async remove(id: string): Promise<void> {
    const unit = await this.getById(id);
    const upcoming = await this.bookings
      .countDocuments({
        unitId: unit._id,
        status: { $in: SLOT_HOLDING_STATUSES },
        startsAt: { $gte: this.clock.now() },
      })
      .exec();
    if (upcoming > 0) {
      throw new ConflictException(
        `This unit has ${upcoming} upcoming booking(s). Cancel them or deactivate the unit instead.`,
      );
    }
    await this.blockedSlots.deleteMany({ unitId: unit._id }).exec();
    await this.units.deleteOne({ _id: toObjectId(id) }).exec();
    this.realtime.availabilityChanged({ unitType: unit.type });
  }

  /** Cron: sets units back to free once busyUntil has passed. Returns how many were released. */
  async releaseExpired(): Promise<number> {
    const now = this.clock.now();
    const expired = await this.units
      .find({ status: 'busy', busyUntil: { $lte: now } })
      .lean<UnitRecord[]>()
      .exec();
    if (expired.length === 0) return 0;

    await this.units
      .updateMany(
        {
          _id: { $in: expired.map((unit) => unit._id) },
          status: 'busy',
          busyUntil: { $lte: now },
        },
        { $set: { status: 'free', busyUntil: null } },
      )
      .exec();
    for (const unit of expired) {
      this.realtime.unitUpdated(
        toUnitDto({ ...unit, status: 'free', busyUntil: null }, now),
      );
    }
    this.logger.log(`Released ${expired.length} unit(s) whose busy time ended`);
    return expired.length;
  }

  private publish(unit: UnitRecord): UnitDto {
    const dto = toUnitDto(unit, this.clock.now());
    this.realtime.unitUpdated(dto);
    return dto;
  }
}
