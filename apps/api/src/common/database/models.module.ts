import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../../bookings/booking.schema';
import { FoodItem, FoodItemSchema } from '../../food/food-item.schema';
import {
  BlockedSlot,
  BlockedSlotSchema,
} from '../../slots/blocked-slot.schema';
import { Unit, UnitSchema } from '../../units/unit.schema';

/**
 * Registers the domain models once so modules that read across collections
 * (availability, dashboard, units) can inject them without circular imports.
 */
const models = MongooseModule.forFeature([
  { name: Unit.name, schema: UnitSchema },
  { name: Booking.name, schema: BookingSchema },
  { name: BlockedSlot.name, schema: BlockedSlotSchema },
  { name: FoodItem.name, schema: FoodItemSchema },
]);

@Module({
  imports: [models],
  exports: [models],
})
export class DatabaseModelsModule {}
