import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { SettingsModule } from '../settings/settings.module';
import { UnitsModule } from '../units/units.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [DatabaseModelsModule, UnitsModule, SettingsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
