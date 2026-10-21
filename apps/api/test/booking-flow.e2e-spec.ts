import {
  addDays,
  type ApiErrorBody,
  type AvailabilityDto,
  type BookingDto,
  businessDateOf,
  type LoginResponse,
} from '@district-viii/shared';
import { getModelToken } from '@nestjs/mongoose';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { Admin } from '../src/auth/admin.schema';
import { hashPassword } from '../src/auth/auth.service';
import { DEFAULT_SETTINGS } from '../src/settings/settings.schema';
import { startTestMongo, type TestMongo } from '../src/testing/mongo-memory';
import { Unit } from '../src/units/unit.schema';

jest.setTimeout(90_000);

const ADMIN = { email: 'admin@test.local', password: 'correct-horse-battery' };

describe('Booking flow (e2e)', () => {
  let mongo: TestMongo;
  let app: NestExpressApplication;
  let http: App;
  let unitId: string;
  const date = addDays(businessDateOf(new Date(), DEFAULT_SETTINGS), 1);

  const slotState = async (startHour: number) => {
    const res = await request(http)
      .get('/availability')
      .query({ type: 'pool', date })
      .expect(200);
    const grid = res.body as AvailabilityDto;
    return grid.units[0]?.slots.find((slot) => slot.startHour === startHour)
      ?.state;
  };

  beforeAll(async () => {
    mongo = await startTestMongo('e2e');
    // ConfigModule validates the environment when AppModule is imported, so set it first.
    process.env.MONGODB_URI = mongo.uri;
    process.env.JWT_SECRET = 'e2e-secret-that-is-definitely-long-enough';
    process.env.CORS_ORIGINS = 'http://localhost:3000';

    const { AppModule } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../src/app.module') as typeof import('../src/app.module');

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>({
      logger: false,
    });
    configureApp(app);
    await app.init();
    http = app.getHttpServer();

    await app.get<Model<Admin>>(getModelToken(Admin.name)).create({
      email: ADMIN.email,
      name: 'Test Admin',
      passwordHash: await hashPassword(ADMIN.password),
    });
    const unit = await app
      .get<Model<Unit>>(getModelToken(Unit.name))
      .create({ name: 'Table 1', type: 'pool' });
    unitId = String(unit._id);
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('creates a pending booking, blocks duplicates, and lets an admin approve it', async () => {
    // 1. Customer requests a slot.
    const created = await request(http)
      .post('/bookings')
      .send({
        unitId,
        businessDate: date,
        startHour: 20,
        customerName: 'Arjun Menon',
        customerPhone: '+91 98460 12345',
      })
      .expect(201);
    const booking = created.body as BookingDto;
    expect(booking).toMatchObject({
      status: 'pending',
      unitName: 'Table 1',
      customerPhone: '9846012345',
      businessDate: date,
      startHour: 20,
    });
    expect(await slotState(20)).toBe('pending');

    // 2. Someone else tries the same slot.
    const conflict = await request(http)
      .post('/bookings')
      .send({
        unitId,
        businessDate: date,
        startHour: 20,
        customerName: 'Nihal K',
        customerPhone: '9123456789',
      })
      .expect(409);
    expect(conflict.body as ApiErrorBody).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
      path: '/bookings',
    });

    // 3. Admin endpoints are guarded.
    await request(http).patch(`/bookings/${booking.id}/approve`).expect(401);

    const login = await request(http)
      .post('/auth/login')
      .send(ADMIN)
      .expect(200);
    const { accessToken } = login.body as LoginResponse;
    const auth = { Authorization: `Bearer ${accessToken}` };

    // 4. Admin approves; the slot shows as booked and the customer sees it.
    const approved = await request(http)
      .patch(`/bookings/${booking.id}/approve`)
      .set(auth)
      .expect(200);
    expect((approved.body as BookingDto).status).toBe('approved');
    expect(await slotState(20)).toBe('booked');

    const mine = await request(http)
      .get('/bookings/by-phone/9846012345')
      .expect(200);
    expect((mine.body as BookingDto[]).map((item) => item.status)).toEqual([
      'approved',
    ]);

    // 5. Approving twice is a conflict, not a silent success.
    await request(http)
      .patch(`/bookings/${booking.id}/approve`)
      .set(auth)
      .expect(409);

    // 6. Customers can't cancel an approved booking; admins can, which frees the slot.
    await request(http)
      .patch(`/bookings/${booking.id}/cancel`)
      .send({ phone: '9846012345' })
      .expect(409);
    await request(http)
      .patch(`/bookings/${booking.id}/cancel`)
      .set(auth)
      .send({})
      .expect(200);
    expect(await slotState(20)).toBe('available');
  });

  it('validates input with a consistent error shape', async () => {
    const res = await request(http)
      .post('/bookings')
      .send({
        unitId,
        businessDate: date,
        startHour: 20,
        customerName: 'A',
        customerPhone: '12345',
        role: 'admin',
      })
      .expect(400);
    const body = res.body as ApiErrorBody;
    expect(body.message).toBe('Validation failed');
    expect(body.details).toEqual(
      expect.arrayContaining([
        'property role should not exist',
        expect.stringContaining('customerName'),
        expect.stringContaining('10-digit Indian mobile'),
      ]),
    );
  });

  it('lets a customer cancel their own pending booking only with the matching phone', async () => {
    const created = await request(http)
      .post('/bookings')
      .send({
        unitId,
        businessDate: date,
        startHour: 22,
        customerName: 'Sreya Nair',
        customerPhone: '9447000001',
      })
      .expect(201);
    const { id } = created.body as BookingDto;

    await request(http)
      .patch(`/bookings/${id}/cancel`)
      .send({ phone: '9447000002' })
      .expect(403);
    const cancelled = await request(http)
      .patch(`/bookings/${id}/cancel`)
      .send({ phone: '9447000001' })
      .expect(200);
    expect((cancelled.body as BookingDto).status).toBe('cancelled');
  });
});
