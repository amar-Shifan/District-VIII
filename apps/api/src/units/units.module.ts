import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { UnitsController } from './units.controller';
import { UnitsScheduler } from './units.scheduler';
import { UnitsService } from './units.service';

@Module({
  imports: [DatabaseModelsModule],
  controllers: [UnitsController],
  providers: [UnitsService, UnitsScheduler],
  exports: [UnitsService],
})
export class UnitsModule {}
