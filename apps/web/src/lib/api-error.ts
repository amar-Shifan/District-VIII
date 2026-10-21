import type { ApiErrorBody } from "@district-viii/shared";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === "object" && value !== null && "statusCode" in value && "message" in value;
}

/** A message that is safe to show a customer for any thrown value. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status >= 500) return fallback;
    return error.body?.details?.[0] ?? error.message;
  }
  return fallback;
}
