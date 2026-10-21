import {
  type AvailabilityDto,
  type IsoDate,
  UNIT_TYPES,
  type UnitType,
  type UnitsSummaryDto,
} from '@district-viii/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { IsIsoDate } from '../common/validation/decorators';
import { AvailabilityService } from './availability.service';

export class AvailabilityQueryDto {
  @IsIn(UNIT_TYPES)
  type!: UnitType;

  /** Business date, YYYY-MM-DD (Asia/Kolkata). */
  @IsIsoDate()
  date!: IsoDate;
}

@ApiTags('availability')
@Controller()
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /** Free units per type right now, with the next free time when none are free. */
  @Get('units/summary')
  summary(): Promise<UnitsSummaryDto> {
    return this.availability.summary();
  }

  /** Hourly slot grid for every active unit of a type on one business date. */
  @Get('availability')
  grid(@Query() query: AvailabilityQueryDto): Promise<AvailabilityDto> {
    return this.availability.availability(query.type, query.date);
  }
}
