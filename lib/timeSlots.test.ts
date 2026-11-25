import { describe, expect, it } from "vitest";
import { isSlotTime, listSlots, type SlotRule } from "./timeSlots";
import { zonedTime } from "./timezone";

// Friday 4:00–6:00 PM in 30-minute slots, 2 orders per slot.
const friday: SlotRule = { dayOfWeek: 5, startTime: "16:00", endTime: "18:00", slotMinutes: 30, maxOrdersPerSlot: 2 };
// All times in Chicago. "Now" is Wednesday Nov 11, 2026 at 9:00 AM there.
const TZ = "America/Chicago";
const now = zonedTime(2026, 11, 11, 9, 0, TZ);
const fri = (h: number, m: number) => zonedTime(2026, 11, 13, h, m, TZ);

describe("listSlots", () => {
  it("splits a window into slots that start before it ends", () => {
    const slots = listSlots([friday], 0, new Map(), now, 3, TZ);
    expect(slots.map((s) => s.time.getTime())).toEqual([fri(16, 0), fri(16, 30), fri(17, 0), fri(17, 30)].map((d) => d.getTime()));
  });

  it("drops slots inside the lead time", () => {
    // 55 hours after Wed 9 AM = Fri 4 PM exactly → 4:00 still OK; 55.5h → 4:00 is too soon, 4:30 is first.
    expect(listSlots([friday], 55, new Map(), now, 3, TZ)[0].time).toEqual(fri(16, 0));
    expect(listSlots([friday], 55.5, new Map(), now, 3, TZ)[0].time).toEqual(fri(16, 30));
  });

  it("counts remaining capacity", () => {
    const taken = new Map([[fri(16, 0).toISOString(), 2], [fri(16, 30).toISOString(), 1]]);
    const [a, b, c] = listSlots([friday], 0, taken, now, 3, TZ);
    expect([a.remaining, b.remaining, c.remaining]).toEqual([0, 1, 2]);
  });

  it("covers the next two weeks by default", () => {
    expect(listSlots([friday], 0, new Map(), now, 14, TZ).length).toBe(8); // two Fridays × 4 slots
  });
});

describe("isSlotTime", () => {
  it("accepts real slot starts and rejects others", () => {
    expect(isSlotTime([friday], fri(16, 30), TZ)).toBe(true);
    expect(isSlotTime([friday], fri(16, 15), TZ)).toBe(false); // not on a 30-min boundary
    expect(isSlotTime([friday], fri(18, 0), TZ)).toBe(false); // window has ended
    expect(isSlotTime([friday], zonedTime(2026, 11, 12, 16, 0, TZ), TZ)).toBe(false); // Thursday
  });
});

describe("slots on a UTC server", () => {
  it("a 4 PM Chicago slot is 22:00 UTC, and Friday stays Friday", () => {
    const [first] = listSlots([friday], 0, new Map(), now, 3, TZ);
    expect(first.time.toISOString()).toBe("2026-11-13T22:00:00.000Z");
    // 5:30 PM Chicago = 23:30 UTC, still a Friday slot.
    expect(isSlotTime([friday], new Date("2026-11-13T23:30:00Z"), TZ)).toBe(true);
  });
});
