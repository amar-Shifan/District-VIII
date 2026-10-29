import { describe, expect, it } from "vitest";
import { NotificationEventTracker } from "./notification-events";

describe("notification sound event deduplication", () => {
  it("returns new IDs once even when polling repeats them", () => {
    const tracker = new NotificationEventTracker();
    expect(tracker.observe(["old-1", "old-2"])).toEqual([]);
    expect(tracker.observe(["old-1", "old-2"])).toEqual([]);
    expect(tracker.observe(["new-1", "old-1"])).toEqual(["new-1"]);
    expect(tracker.observe(["new-1"])).toEqual([]);
  });
});
