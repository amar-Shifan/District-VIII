import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { SettingsModule } from '../settings/settings.module';
import { UnitsModule } from '../units/units.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [DatabaseModelsModule, UnitsModule, SettingsModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
