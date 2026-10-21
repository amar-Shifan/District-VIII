import type { UpdateSettingsInput } from '@district-viii/shared';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { SanitizeText } from '../common/validation/decorators';

export class UpdateSettingsDto implements UpdateSettingsInput {
  @IsOptional()
  @SanitizeText()
  @IsString()
  @Length(2, 60)
  arenaName?: string;

  /** Opening hour, 0 to 23 (Asia/Kolkata). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  openHour?: number;

  /** Closing hour, 0 to 23. A value at or below openHour means the session ends after midnight. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  closeHour?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  slotDurationHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  bookingWindowDays?: number;
}
