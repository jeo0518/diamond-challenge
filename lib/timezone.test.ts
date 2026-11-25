import { describe, expect, it } from "vitest";
import { parseLocalDateTime, toLocalDateTimeInput, wallClock, zonedTime } from "./timezone";

describe("time zones (servers run on UTC, restaurants don't)", () => {
  it("4:00 PM in Chicago in winter is 22:00 UTC", () => {
    expect(zonedTime(2026, 11, 13, 16, 0, "America/Chicago").toISOString()).toBe("2026-11-13T22:00:00.000Z");
  });

  it("4:00 PM in Chicago in summer (daylight time) is 21:00 UTC", () => {
    expect(zonedTime(2026, 7, 10, 16, 0, "America/Chicago").toISOString()).toBe("2026-07-10T21:00:00.000Z");
  });

  it("works on the daylight-saving change days", () => {
    // Nov 1, 2026: clocks fall back at 2 AM. Noon that day is CST (UTC−6).
    expect(zonedTime(2026, 11, 1, 12, 0, "America/Chicago").toISOString()).toBe("2026-11-01T18:00:00.000Z");
    // Mar 8, 2026: clocks spring forward at 2 AM. Noon that day is CDT (UTC−5).
    expect(zonedTime(2026, 3, 8, 12, 0, "America/Chicago").toISOString()).toBe("2026-03-08T17:00:00.000Z");
  });

  it("reads the wall clock, including the weekday", () => {
    // 03:30 UTC on Saturday is still Friday evening in Los Angeles.
    const w = wallClock(new Date("2026-11-14T03:30:00Z"), "America/Los_Angeles");
    expect(w).toEqual({ year: 2026, month: 11, day: 13, hour: 19, minute: 30, weekday: 5 });
  });

  it("round-trips datetime-local strings", () => {
    const d = parseLocalDateTime("2026-11-13T16:00", "America/New_York")!;
    expect(d.toISOString()).toBe("2026-11-13T21:00:00.000Z");
    expect(toLocalDateTimeInput(d, "America/New_York")).toBe("2026-11-13T16:00");
    expect(parseLocalDateTime("not a date", "America/New_York")).toBeNull();
  });

  it("rolls over day 32 into the next month", () => {
    expect(zonedTime(2026, 1, 32, 9, 0, "UTC").toISOString()).toBe("2026-02-01T09:00:00.000Z");
  });
});
