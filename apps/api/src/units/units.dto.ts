import {
  type CreateUnitInput,
  UNIT_STATUSES,
  UNIT_TYPES,
  type UnitStatus,
  type UnitType,
  type UpdateUnitInput,
  type UpdateUnitStatusInput,
} from '@district-viii/shared';
import {
  IsBoolean,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from 'class-validator';
import { SanitizeText } from '../common/validation/decorators';

export class CreateUnitDto implements CreateUnitInput {
  @SanitizeText()
  @IsString()
  @Length(1, 40)
  name!: string;

  @IsIn(UNIT_TYPES)
  type!: UnitType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitDto implements UpdateUnitInput {
  @IsOptional()
  @SanitizeText()
  @IsString()
  @Length(1, 40)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUnitStatusDto implements UpdateUnitStatusInput {
  @IsIn(UNIT_STATUSES)
  status!: UnitStatus;

  /** Required when status is "busy"; must be in the future. */
  @ValidateIf((dto: UpdateUnitStatusDto) => dto.status === 'busy')
  @IsISO8601({ strict: true })
  busyUntil?: string;
}
