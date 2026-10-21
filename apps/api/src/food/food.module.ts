import { Module } from '@nestjs/common';
import { DatabaseModelsModule } from '../common/database/models.module';
import { FoodController } from './food.controller';
import { FoodService } from './food.service';

@Module({
  imports: [DatabaseModelsModule],
  controllers: [FoodController],
  providers: [FoodService],
})
export class FoodModule {}
