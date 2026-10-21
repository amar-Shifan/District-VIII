import {
  BOOKING_SORT_FIELDS,
  BOOKING_STATUSES,
  type BookingListQuery,
  type BookingSortField,
  type BookingStatus,
  type CancelBookingInput,
  type CreateBookingInput,
  CUSTOMER_NAME_MAX,
  CUSTOMER_NAME_MIN,
  type IsoDate,
  REASON_MAX,
  type RejectBookingInput,
  UNIT_TYPES,
  type UnitType,
} from '@district-viii/shared';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IsIndianPhone,
  IsIsoDate,
  NormalizePhone,
  SanitizeText,
} from '../common/validation/decorators';

export class CreateBookingDto implements CreateBookingInput {
  @IsMongoId()
  unitId!: string;

  /** Business date (YYYY-MM-DD). Slots from midnight to closing belong to the previous date. */
  @IsIsoDate()
  businessDate!: IsoDate;

  /** Clock hour the slot starts at, 0 to 23. */
  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @SanitizeText()
  @IsString()
  @Length(CUSTOMER_NAME_MIN, CUSTOMER_NAME_MAX)
  customerName!: string;

  /** 10-digit Indian mobile, optionally prefixed with +91. */
  @NormalizePhone()
  @IsIndianPhone()
  customerPhone!: string;
}

export class CancelBookingDto implements CancelBookingInput {
  /** Required for customers. Admins cancel with their bearer token instead. */
  @IsOptional()
  @NormalizePhone()
  @IsIndianPhone()
  phone?: string;
}

export class RejectBookingDto implements RejectBookingInput {
  @IsOptional()
  @SanitizeText()
  @IsString()
  @MaxLength(REASON_MAX)
  reason?: string;
}

export class ListBookingsQueryDto implements BookingListQuery {
  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: BookingStatus;

  @IsOptional()
  @IsIn(UNIT_TYPES)
  type?: UnitType;

  /** Earliest business date, inclusive. */
  @IsOptional()
  @IsIsoDate()
  from?: IsoDate;

  /** Latest business date, inclusive. */
  @IsOptional()
  @IsIsoDate()
  to?: IsoDate;

  /** Matches customer name or phone. */
  @IsOptional()
  @SanitizeText()
  @IsString()
  @MaxLength(60)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsIn(BOOKING_SORT_FIELDS)
  sort?: BookingSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
