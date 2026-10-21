import {
  type BookingDto,
  type BookingSource,
  type BookingStatus,
  businessDateOf,
  diffDays,
  isOperatingSlot,
  isSlotPast,
  maskPhone,
  type Paginated,
  slotStart,
} from '@district-viii/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder } from 'mongoose';
import type { AdminPrincipal } from '../auth/jwt-payload';
import { ClockService } from '../common/clock/clock.service';
import {
  escapeRegex,
  isDuplicateKeyError,
  toObjectId,
} from '../common/database/mongo-errors';
import { RealtimeService } from '../realtime/realtime.service';
import { SettingsService } from '../settings/settings.service';
import { BlockedSlot } from '../slots/blocked-slot.schema';
import { effectiveStatus } from '../units/unit.mapper';
import { UnitsService } from '../units/units.service';
import { toBookingDto } from './booking.mapper';
import { Booking, type BookingRecord } from './booking.schema';
import { CreateBookingDto, ListBookingsQueryDto } from './bookings.dto';

export const SLOT_TAKEN_MESSAGE =
  'Sorry, someone just requested this slot. Please pick another time.';
/** Admins may log walk-ins and phone bookings further ahead than customers. */
const ADMIN_BOOKING_DAYS_AHEAD = 30;
const CUSTOMER_HISTORY_DAYS = 14;
const CUSTOMER_HISTORY_LIMIT = 20;
const DAY_MS = 86_400_000;

@Injectable()
export class BookingsService implements OnModuleInit {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name) private readonly bookings: Model<Booking>,
    @InjectModel(BlockedSlot.name)
    private readonly blockedSlots: Model<BlockedSlot>,
    private readonly units: UnitsService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
    private readonly realtime: RealtimeService,
  ) {}

  /** The double-booking guard lives in the unique partial index; make sure it exists before taking traffic. */
  async onModuleInit(): Promise<void> {
    await this.bookings.createIndexes();
  }

  async create(
    input: CreateBookingDto,
    source: BookingSource,
  ): Promise<BookingDto> {
    const now = this.clock.now();
    const settings = await this.settings.get();
    const unit = await this.units.getById(input.unitId);

    if (!unit.isActive)
      throw new BadRequestException('This unit is not open for booking');
    const status = effectiveStatus(unit, now);
    if (status === 'maintenance')
      throw new ConflictException(`${unit.name} is under maintenance`);
    if (!isOperatingSlot(input.startHour, settings)) {
      throw new BadRequestException('That time is outside operating hours');
    }

    const dayOffset = diffDays(
      businessDateOf(now, settings),
      input.businessDate,
    );
    const maxOffset =
      source === 'online'
        ? settings.bookingWindowDays - 1
        : ADMIN_BOOKING_DAYS_AHEAD;
    if (dayOffset < 0 || dayOffset > maxOffset) {
      throw new BadRequestException(
        source === 'online'
          ? `Bookings are open for the next ${settings.bookingWindowDays} day(s) only`
          : `Walk-in bookings can be made up to ${ADMIN_BOOKING_DAYS_AHEAD} days ahead`,
      );
    }

    const startsAt = slotStart(input.businessDate, input.startHour, settings);
    if (isSlotPast(startsAt, now))
      throw new BadRequestException('This slot has already started');
    if (status === 'busy' && unit.busyUntil && unit.busyUntil > startsAt) {
      throw new ConflictException(`${unit.name} is in use at that time`);
    }
    const blocked = await this.blockedSlots
      .exists({
        unitId: unit._id,
        businessDate: input.businessDate,
        startHour: input.startHour,
      })
      .exec();
    if (blocked) throw new ConflictException('This slot is not available');

    let created: BookingRecord;
    try {
      const doc = await this.bookings.create({
        unitId: unit._id,
        unitType: unit.type,
        businessDate: input.businessDate,
        startHour: input.startHour,
        durationHours: settings.slotDurationHours,
        startsAt,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        status: source === 'walk-in' ? 'approved' : 'pending',
        source,
        approvedAt: source === 'walk-in' ? now : null,
      });
      created = doc.toObject<BookingRecord>();
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictException(SLOT_TAKEN_MESSAGE);
      throw error;
    }

    const dto = toBookingDto(created, unit.name);
    this.logger.log(
      `Booking ${dto.id} created (${source}) for ${maskPhone(dto.customerPhone)}`,
    );
    this.realtime.bookingCreated(dto);
    return dto;
  }

  async list(query: ListBookingsQueryDto): Promise<Paginated<BookingDto>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter: FilterQuery<Booking> = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.unitType = query.type;
    if (query.from || query.to) {
      filter.businessDate = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    if (query.search) {
      const digits = query.search.replace(/\D/g, '');
      const or: FilterQuery<Booking>[] = [
        { customerName: { $regex: escapeRegex(query.search), $options: 'i' } },
      ];
      if (digits.length >= 3)
        or.push({ customerPhone: { $regex: escapeRegex(digits.slice(-10)) } });
      filter.$or = or;
    }

    const direction: SortOrder = query.order === 'asc' ? 1 : -1;
    const sortField = query.sort ?? 'createdAt';
    const sort: Record<string, SortOrder> =
      sortField === 'businessDate'
        ? { businessDate: direction, startsAt: direction }
        : { [sortField]: direction, _id: direction };

    const [total, rows, names] = await Promise.all([
      this.bookings.countDocuments(filter).exec(),
      this.bookings
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<BookingRecord[]>()
        .exec(),
      this.units.nameMap(),
    ]);

    return {
      items: rows.map((row) =>
        toBookingDto(row, names.get(String(row.unitId)) ?? 'Removed unit'),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async approve(id: string): Promise<BookingDto> {
    return this.transition(id, ['pending'], {
      status: 'approved',
      approvedAt: this.clock.now(),
    });
  }

  async reject(id: string, reason?: string): Promise<BookingDto> {
    return this.transition(id, ['pending'], {
      status: 'rejected',
      rejectionReason: reason || null,
    });
  }

  /** Admins can cancel pending or approved bookings; customers only their own pending ones. */
  async cancel(
    id: string,
    actor: { admin?: AdminPrincipal; phone?: string },
  ): Promise<BookingDto> {
    if (actor.admin)
      return this.transition(id, ['pending', 'approved'], {
        status: 'cancelled',
      });

    if (!actor.phone)
      throw new BadRequestException('phone is required to cancel a booking');
    const booking = await this.bookings
      .findById(id)
      .lean<BookingRecord>()
      .exec();
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerPhone !== actor.phone) {
      throw new ForbiddenException(
        'This booking belongs to a different phone number',
      );
    }
    return this.transition(id, ['pending'], { status: 'cancelled' });
  }

  async byPhone(phone: string): Promise<BookingDto[]> {
    const since = new Date(
      this.clock.now().getTime() - CUSTOMER_HISTORY_DAYS * DAY_MS,
    );
    const [rows, names] = await Promise.all([
      this.bookings
        .find({ customerPhone: phone, startsAt: { $gte: since } })
        .sort({ startsAt: -1 })
        .limit(CUSTOMER_HISTORY_LIMIT)
        .lean<BookingRecord[]>()
        .exec(),
      this.units.nameMap(),
    ]);
    return rows.map((row) =>
      toBookingDto(row, names.get(String(row.unitId)) ?? 'Removed unit'),
    );
  }

  /** Atomic status change: only applies when the booking is still in one of `from`. */
  private async transition(
    id: string,
    from: BookingStatus[],
    update: Partial<Pick<Booking, 'status' | 'approvedAt' | 'rejectionReason'>>,
  ): Promise<BookingDto> {
    const updated = await this.bookings
      .findOneAndUpdate(
        { _id: toObjectId(id), status: { $in: from } },
        { $set: update },
        { new: true },
      )
      .lean<BookingRecord>()
      .exec();
    if (!updated) {
      const existing = await this.bookings
        .findById(id, { status: 1 })
        .lean<BookingRecord>()
        .exec();
      if (!existing) throw new NotFoundException('Booking not found');
      throw new ConflictException(`This booking is already ${existing.status}`);
    }
    const names = await this.units.nameMap();
    const dto = toBookingDto(
      updated,
      names.get(String(updated.unitId)) ?? 'Removed unit',
    );
    this.realtime.bookingUpdated(dto);
    return dto;
  }
}
