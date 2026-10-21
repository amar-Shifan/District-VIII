import {
  type CreateBlockedSlotInput,
  type IsoDate,
  REASON_MAX,
  type UpdateBlockedSlotInput,
} from '@district-viii/shared';
import {
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { IsIsoDate, SanitizeText } from '../common/validation/decorators';

export class CreateBlockedSlotDto implements CreateBlockedSlotInput {
  @IsMongoId()
  unitId!: string;

  @IsIsoDate()
  businessDate!: IsoDate;

  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @SanitizeText()
  @IsString()
  @Length(2, REASON_MAX)
  reason!: string;
}

export class UpdateBlockedSlotDto implements UpdateBlockedSlotInput {
  @SanitizeText()
  @IsString()
  @Length(2, REASON_MAX)
  reason!: string;
}

export class ListBlockedSlotsQueryDto {
  @IsOptional()
  @IsIsoDate()
  date?: IsoDate;

  @IsOptional()
  @IsMongoId()
  unitId?: string;
}
