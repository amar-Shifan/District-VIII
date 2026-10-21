import "server-only";

/** Single source of "now", so tests can pin time. */
let override: (() => Date) | null = null;

export function now(): Date {
  return override ? override() : new Date();
}

export function setClock(fn: (() => Date) | null): void {
  override = fn;
}
