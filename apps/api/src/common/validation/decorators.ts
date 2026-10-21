import {
  INDIAN_PHONE_PATTERN,
  isValidIsoDate,
  normalizePhone,
} from '@district-viii/shared';
import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

const HTML_TAG = /<[^>]*>/g;
// Control characters and stray angle brackets never belong in names, reasons or descriptions.
// eslint-disable-next-line no-control-regex
const UNSAFE_TEXT = /[\u0000-\u001f\u007f<>]/g;

export function sanitizeText(value: string): string {
  return value
    .replace(HTML_TAG, '')
    .replace(UNSAFE_TEXT, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trims, collapses whitespace and strips HTML tags and unsafe characters from free text. */
export function SanitizeText(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? sanitizeText(value) : value,
  );
}

/** Normalizes valid Indian mobile numbers to 10 digits; leaves invalid input for the validator. */
export function NormalizePhone(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? (normalizePhone(value) ?? value) : value,
  );
}

export function IsIndianPhone(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isIndianPhone',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: {
        message:
          'phone must be a 10-digit Indian mobile number, optionally prefixed with +91',
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && INDIAN_PHONE_PATTERN.test(value),
      },
    });
  };
}

export function IsIsoDate(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isIsoDate',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: {
        message: `${propertyName.toString()} must be a YYYY-MM-DD date`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidIsoDate(value),
      },
    });
  };
}
