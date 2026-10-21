import type { UpsertFoodItemInput } from '@district-viii/shared';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { SanitizeText } from '../common/validation/decorators';

export class CreateFoodItemDto implements UpsertFoodItemInput {
  @SanitizeText()
  @IsString()
  @Length(2, 60)
  name!: string;

  @SanitizeText()
  @IsString()
  @Length(2, 30)
  category!: string;

  @IsOptional()
  @SanitizeText()
  @IsString()
  @MaxLength(240)
  description?: string;

  /** Absolute http(s) URL or a path served by the web app (e.g. /images/food/burger.jpg). */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  @Matches(/^(https?:\/\/[^\s<>"]+|\/[^\s<>"]*)?$/, {
    message: 'imageUrl must be an http(s) URL or a path starting with /',
  })
  imageUrl?: string;

  /** Hidden from customers for now. */
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100_000)
  price?: number | null;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class UpdateFoodItemDto extends PartialType(CreateFoodItemDto) {}

export class FoodQueryDto {
  @IsOptional()
  @SanitizeText()
  @IsString()
  @MaxLength(30)
  category?: string;
}
