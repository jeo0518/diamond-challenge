import { describe, expect, it } from "vitest";
import { submitProblems, type SubmitCheckInput } from "./submitChecks";

const now = new Date(2026, 10, 11, 9, 0);
const ok: SubmitCheckInput = {
  status: "COLLECTING",
  acceptsGroupOrders: true,
  totalQty: 20,
  minGroupSize: 10,
  maxGroupSize: 100,
  scheduledFor: new Date(2026, 10, 13, 16, 0), // 55 hours later
  leadTimeHours: 24,
  now,
  unavailableItems: [],
  slotIsFull: false,
};

describe("submitProblems", () => {
  it("passes a valid order", () => expect(submitProblems(ok)).toEqual([]));

  it("checks the minimum and maximum group size", () => {
    expect(submitProblems({ ...ok, totalQty: 9 })[0]).toContain("at least 10");
    expect(submitProblems({ ...ok, totalQty: 10 })).toEqual([]);
    expect(submitProblems({ ...ok, totalQty: 101 })[0]).toContain("at most 100");
    expect(submitProblems({ ...ok, totalQty: 500, maxGroupSize: null })).toEqual([]);
  });

  it("checks the lead time is still respected", () => {
    expect(submitProblems({ ...ok, leadTimeHours: 55 })).toEqual([]);
    expect(submitProblems({ ...ok, leadTimeHours: 56 })[0]).toContain("at least 56 hours");
  });

  it("refuses orders that aren't collecting", () => {
    expect(submitProblems({ ...ok, status: "SUBMITTED" })).toHaveLength(1);
  });

  it("reports empty orders, unavailable items, and full slots", () => {
    expect(submitProblems({ ...ok, totalQty: 0 })[0]).toContain("Add some items");
    expect(submitProblems({ ...ok, unavailableItems: ["Wings"] })[0]).toContain("Wings");
    expect(submitProblems({ ...ok, slotIsFull: true })[0]).toContain("full");
  });
});
