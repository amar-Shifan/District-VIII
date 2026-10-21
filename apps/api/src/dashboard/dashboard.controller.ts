import type {
  BookingsPerDayPoint,
  DashboardStatsDto,
  PeakHourPoint,
  StatusSplitPoint,
  UsageByTypePoint,
} from '@district-viii/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { AdminOnly } from '../auth/admin-only.decorator';
import { DashboardService } from './dashboard.service';

export class DaysQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}

@ApiTags('admin: dashboard')
@AdminOnly()
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('stats')
  stats(): Promise<DashboardStatsDto> {
    return this.dashboard.stats();
  }

  /** Defaults to the last 7 business days. */
  @Get('bookings-per-day')
  bookingsPerDay(@Query() query: DaysQueryDto): Promise<BookingsPerDayPoint[]> {
    return this.dashboard.bookingsPerDay(query.days ?? 7);
  }

  /** Defaults to the last 30 business days. */
  @Get('peak-hours')
  peakHours(@Query() query: DaysQueryDto): Promise<PeakHourPoint[]> {
    return this.dashboard.peakHours(query.days ?? 30);
  }

  @Get('usage-by-type')
  usageByType(@Query() query: DaysQueryDto): Promise<UsageByTypePoint[]> {
    return this.dashboard.usageByType(query.days ?? 30);
  }

  @Get('status-split')
  statusSplit(@Query() query: DaysQueryDto): Promise<StatusSplitPoint[]> {
    return this.dashboard.statusSplit(query.days ?? 30);
  }
}
