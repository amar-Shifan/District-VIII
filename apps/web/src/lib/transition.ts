/**
 * Hand-off flag between the landing reveal and the Home screen, so Home can
 * fade out of the burgundy circle instead of popping in. Module state is
 * enough because it only needs to survive a client-side navigation.
 */
let revealPending = false;

export function markRevealPending(): void {
  revealPending = true;
}

export function isRevealPending(): boolean {
  return revealPending;
}

export function clearRevealPending(): void {
  revealPending = false;
}
