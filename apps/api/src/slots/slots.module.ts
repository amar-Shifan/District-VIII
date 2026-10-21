import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { SettingsModule } from '../settings/settings.module';
import { UnitsModule } from '../units/units.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [DatabaseModelsModule, UnitsModule, SettingsModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}
