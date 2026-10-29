/** Adds seen IDs and returns each newly observed notification only once. */
export function collectNewNotificationIds(ids: string[], seen: Set<string>): string[] {
  const fresh: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) fresh.push(id);
    seen.add(id);
  }
  return fresh;
}

export class NotificationEventTracker {
  private readonly seen = new Set<string>();
  private initialized = false;

  observe(ids: string[]): string[] {
    if (!this.initialized) {
      collectNewNotificationIds(ids, this.seen);
      this.initialized = true;
      return [];
    }
    return collectNewNotificationIds(ids, this.seen);
  }
}
