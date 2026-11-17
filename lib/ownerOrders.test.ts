import { describe, expect, it } from "vitest";
import { isDueSoon } from "./ownerOrders";

const now = new Date(2026, 10, 17, 12, 0);
const inHours = (h: number) => new Date(now.getTime() + h * 3_600_000);

describe("isDueSoon", () => {
  it("flags active orders due within 24 hours (including overdue)", () => {
    expect(isDueSoon({ scheduledFor: inHours(23), status: "ACCEPTED" }, now)).toBe(true);
    expect(isDueSoon({ scheduledFor: inHours(24), status: "SUBMITTED" }, now)).toBe(true);
    expect(isDueSoon({ scheduledFor: inHours(-1), status: "READY" }, now)).toBe(true);
  });
  it("ignores later and finished orders", () => {
    expect(isDueSoon({ scheduledFor: inHours(25), status: "ACCEPTED" }, now)).toBe(false);
    expect(isDueSoon({ scheduledFor: inHours(2), status: "COMPLETED" }, now)).toBe(false);
    expect(isDueSoon({ scheduledFor: inHours(2), status: "REJECTED" }, now)).toBe(false);
  });
});
