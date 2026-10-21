import {
  type BookingDto,
  normalizePhone,
  type Paginated,
} from '@district-viii/shared';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  PipeTransform,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiConflictResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminOnly, CurrentAdmin } from '../auth/admin-only.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards';
import type { AdminPrincipal } from '../auth/jwt-payload';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import {
  CancelBookingDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  RejectBookingDto,
} from './bookings.dto';
import { BookingsService } from './bookings.service';

class ParsePhonePipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const phone = normalizePhone(decodeURIComponent(value));
    if (!phone)
      throw new BadRequestException('Enter a 10-digit Indian mobile number');
    return phone;
  }
}

const PUBLIC_WRITE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  /** Customer booking request. Holds the slot as "pending" until an admin decides. */
  @Throttle(PUBLIC_WRITE_LIMIT)
  @ApiConflictResponse({
    description: 'The slot is already held, blocked or the unit is busy',
  })
  @Post()
  create(@Body() body: CreateBookingDto): Promise<BookingDto> {
    return this.bookings.create(body, 'online');
  }

  /** Walk-in or phone booking entered by an admin. Approved immediately. */
  @AdminOnly()
  @Post('admin')
  createWalkIn(@Body() body: CreateBookingDto): Promise<BookingDto> {
    return this.bookings.create(body, 'walk-in');
  }

  @AdminOnly()
  @Get()
  list(@Query() query: ListBookingsQueryDto): Promise<Paginated<BookingDto>> {
    return this.bookings.list(query);
  }

  /** A customer's recent and upcoming bookings. */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('by-phone/:phone')
  byPhone(
    @Param('phone', ParsePhonePipe) phone: string,
  ): Promise<BookingDto[]> {
    return this.bookings.byPhone(phone);
  }

  @AdminOnly()
  @Patch(':id/approve')
  approve(@Param('id', ParseObjectIdPipe) id: string): Promise<BookingDto> {
    return this.bookings.approve(id);
  }

  @AdminOnly()
  @Patch(':id/reject')
  reject(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: RejectBookingDto,
  ): Promise<BookingDto> {
    return this.bookings.reject(id, body.reason);
  }

  /**
   * Customers cancel their own pending booking by sending the matching phone.
   * Admins send their bearer token and may cancel pending or approved bookings.
   */
  @Throttle(PUBLIC_WRITE_LIMIT)
  @UseGuards(OptionalJwtAuthGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: CancelBookingDto,
    @CurrentAdmin() admin?: AdminPrincipal,
  ): Promise<BookingDto> {
    return this.bookings.cancel(id, { admin, phone: body.phone });
  }
}
