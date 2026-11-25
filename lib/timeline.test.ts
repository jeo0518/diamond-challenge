import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

const t = (h: number) => new Date(2026, 10, 25, h);
const ev = (toStatus: Parameters<typeof buildTimeline>[0], h: number, note: string | null = null) => ({ toStatus, createdAt: t(h), note });

describe("buildTimeline", () => {
  it("marks done, current, and upcoming steps", () => {
    const steps = buildTimeline("ACCEPTED", [ev("COLLECTING", 1), ev("SUBMITTED", 2), ev("ACCEPTED", 3)]);
    expect(steps.map((s) => `${s.status}:${s.state}`)).toEqual([
      "COLLECTING:done", "SUBMITTED:done", "ACCEPTED:current", "PREPARING:upcoming", "READY:upcoming", "COMPLETED:upcoming",
    ]);
    expect(steps[2].at).toEqual(t(3));
  });

  it("shows completed orders as fully done", () => {
    const steps = buildTimeline("COMPLETED", ["COLLECTING", "SUBMITTED", "ACCEPTED", "PREPARING", "READY", "COMPLETED"].map((s, i) => ev(s as never, i)));
    expect(steps.every((s) => s.state === "done")).toBe(true);
  });

  it("ends a rejected order with the reason", () => {
    const steps = buildTimeline("REJECTED", [ev("COLLECTING", 1), ev("SUBMITTED", 2), ev("REJECTED", 3, "Closed that day")]);
    expect(steps.map((s) => `${s.status}:${s.state}`)).toEqual(["COLLECTING:done", "SUBMITTED:done", "REJECTED:stopped"]);
    expect(steps[2].note).toBe("Closed that day");
  });

  it("ends an order cancelled while collecting", () => {
    const steps = buildTimeline("CANCELLED", [ev("COLLECTING", 1), ev("CANCELLED", 2)]);
    expect(steps.map((s) => s.status)).toEqual(["COLLECTING", "CANCELLED"]);
  });
});
