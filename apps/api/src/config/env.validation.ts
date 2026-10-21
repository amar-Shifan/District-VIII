import { plainToInstance, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import type { StringValue } from 'ms';

export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(({ value }) => Number(value ?? 4000))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  MONGODB_URI!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  /** Token lifetime in `ms` format, e.g. "12h". */
  JWT_EXPIRES_IN: StringValue = '12h';

  /** Comma-separated list of allowed browser origins. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  /** Express "trust proxy" value, so rate limiting sees the real client IP behind the Next.js proxy. */
  @IsOptional()
  @IsString()
  TRUST_PROXY = 'loopback';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return validated;
}

export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/** Private-network origins (phones on the same Wi-Fi), allowed outside production only. */
export const LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function corsOrigins(
  value: string,
  nodeEnv: EnvironmentVariables['NODE_ENV'],
): (string | RegExp)[] {
  const origins: (string | RegExp)[] = parseOrigins(value);
  if (nodeEnv !== 'production') origins.push(LAN_ORIGIN);
  return origins;
}
