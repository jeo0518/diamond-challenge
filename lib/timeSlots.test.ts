import { describe, expect, it } from "vitest";
import { isSlotTime, listSlots, type SlotRule } from "./timeSlots";

// Friday 4:00–6:00 PM in 30-minute slots, 2 orders per slot.
const friday: SlotRule = { dayOfWeek: 5, startTime: "16:00", endTime: "18:00", slotMinutes: 30, maxOrdersPerSlot: 2 };
// "Now" is Wednesday Nov 11, 2026 at 9:00 AM (server local time).
const now = new Date(2026, 10, 11, 9, 0);
const fri = (h: number, m: number) => new Date(2026, 10, 13, h, m);

describe("listSlots", () => {
  it("splits a window into slots that start before it ends", () => {
    const slots = listSlots([friday], 0, new Map(), now, 3);
    expect(slots.map((s) => s.time.getTime())).toEqual([fri(16, 0), fri(16, 30), fri(17, 0), fri(17, 30)].map((d) => d.getTime()));
  });

  it("drops slots inside the lead time", () => {
    // 55 hours after Wed 9 AM = Fri 4 PM exactly → 4:00 still OK; 55.5h → 4:00 is too soon, 4:30 is first.
    expect(listSlots([friday], 55, new Map(), now, 3)[0].time).toEqual(fri(16, 0));
    expect(listSlots([friday], 55.5, new Map(), now, 3)[0].time).toEqual(fri(16, 30));
  });

  it("counts remaining capacity", () => {
    const taken = new Map([[fri(16, 0).toISOString(), 2], [fri(16, 30).toISOString(), 1]]);
    const [a, b, c] = listSlots([friday], 0, taken, now, 3);
    expect([a.remaining, b.remaining, c.remaining]).toEqual([0, 1, 2]);
  });

  it("covers the next two weeks by default", () => {
    expect(listSlots([friday], 0, new Map(), now).length).toBe(8); // two Fridays × 4 slots
  });
});

describe("isSlotTime", () => {
  it("accepts real slot starts and rejects others", () => {
    expect(isSlotTime([friday], fri(16, 30))).toBe(true);
    expect(isSlotTime([friday], fri(16, 15))).toBe(false); // not on a 30-min boundary
    expect(isSlotTime([friday], fri(18, 0))).toBe(false); // window has ended
    expect(isSlotTime([friday], new Date(2026, 10, 12, 16, 0))).toBe(false); // Thursday
  });
});
