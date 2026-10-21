import { addDays, businessDateOf } from '@district-viii/shared';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Model } from 'mongoose';
import { CommonModule } from '../common/common.module';
import { DatabaseModelsModule } from '../common/database/models.module';
import { DEFAULT_SETTINGS } from '../settings/settings.schema';
import { SettingsModule } from '../settings/settings.module';
import { startTestMongo, type TestMongo } from '../testing/mongo-memory';
import { TestRealtimeModule } from '../testing/test-realtime.module';
import { Unit } from '../units/unit.schema';
import { UnitsModule } from '../units/units.module';
import { Booking } from './booking.schema';
import { BookingsService, SLOT_TAKEN_MESSAGE } from './bookings.service';

jest.setTimeout(60_000);

describe('BookingsService (double-booking protection)', () => {
  let mongo: TestMongo;
  let moduleRef: TestingModule;
  let service: BookingsService;
  let units: Model<Unit>;
  let bookings: Model<Booking>;
  let unitId: string;
  const tomorrow = addDays(businessDateOf(new Date(), DEFAULT_SETTINGS), 1);

  const request = (startHour: number, phone = '9876543210') => ({
    unitId,
    businessDate: tomorrow,
    startHour,
    customerName: 'Test Customer',
    customerPhone: phone,
  });

  beforeAll(async () => {
    mongo = await startTestMongo('bookings');
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongo.uri),
        CommonModule,
        TestRealtimeModule,
        DatabaseModelsModule,
        SettingsModule,
        UnitsModule,
      ],
      providers: [BookingsService],
    }).compile();
    await moduleRef.init();

    service = moduleRef.get(BookingsService);
    units = moduleRef.get(getModelToken(Unit.name));
    bookings = moduleRef.get(getModelToken(Booking.name));
    const unit = await units.create({ name: 'Table 1', type: 'pool' });
    unitId = String(unit._id);
  });

  afterEach(async () => {
    await bookings.deleteMany({});
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongo?.stop();
  });

  it('lets exactly one of many concurrent requests hold a slot', async () => {
    const attempts = Array.from({ length: 8 }, (_, index) =>
      service.create(
        request(20, `98765432${String(index).padStart(2, '0')}`),
        'online',
      ),
    );
    const results = await Promise.allSettled(attempts);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect(result.reason).toBeInstanceOf(ConflictException);
      expect((result.reason as ConflictException).message).toBe(
        SLOT_TAKEN_MESSAGE,
      );
    }
    expect(await bookings.countDocuments({ startHour: 20 })).toBe(1);
  });

  it('frees the slot when the hold is rejected or cancelled', async () => {
    const first = await service.create(request(21), 'online');
    await expect(service.create(request(21), 'online')).rejects.toBeInstanceOf(
      ConflictException,
    );

    await service.reject(first.id, 'Reserved');
    const second = await service.create(request(21), 'online');
    expect(second.status).toBe('pending');

    await service.cancel(second.id, { phone: '9876543210' });
    await expect(service.create(request(21), 'online')).resolves.toMatchObject({
      status: 'pending',
    });
  });

  it('auto-approves walk-ins and still blocks a second hold', async () => {
    const walkIn = await service.create(request(22), 'walk-in');
    expect(walkIn.status).toBe('approved');
    expect(walkIn.approvedAt).not.toBeNull();
    await expect(service.create(request(22), 'online')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects slots outside operating hours or the booking window', async () => {
    await expect(service.create(request(9), 'online')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create(
        { ...request(20), businessDate: addDays(tomorrow, 5) },
        'online',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a customer cancel with the wrong phone', async () => {
    const booking = await service.create(request(23), 'online');
    await expect(
      service.cancel(booking.id, { phone: '9000000000' }),
    ).rejects.toThrow('different phone number');
  });
});
