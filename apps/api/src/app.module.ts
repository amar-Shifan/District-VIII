import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { BookingsModule } from './bookings/bookings.module';
import { CommonModule } from './common/common.module';
import {
  type EnvironmentVariables,
  validateEnv,
} from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { FoodModule } from './food/food.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SettingsModule } from './settings/settings.module';
import { SlotsModule } from './slots/slots.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    // Generous global default; stricter per-route limits on public writes and login.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    CommonModule,
    RealtimeModule,
    AuthModule,
    SettingsModule,
    UnitsModule,
    AvailabilityModule,
    BookingsModule,
    SlotsModule,
    FoodModule,
    DashboardModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
