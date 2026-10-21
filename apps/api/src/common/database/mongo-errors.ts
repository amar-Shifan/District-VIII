import { Types } from 'mongoose';

const DUPLICATE_KEY_CODE = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === DUPLICATE_KEY_CODE
  );
}

export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** Escapes user input before using it inside a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
