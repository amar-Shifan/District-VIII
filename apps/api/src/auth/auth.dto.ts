import type { LoginInput } from '@district-viii/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto implements LoginInput {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  password!: string;
}
