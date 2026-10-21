import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { SettingsModule } from '../settings/settings.module';
import { UnitsModule } from '../units/units.module';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

@Module({
  imports: [DatabaseModelsModule, UnitsModule, SettingsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
