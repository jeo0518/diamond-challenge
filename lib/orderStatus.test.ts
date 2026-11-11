import { describe, expect, it } from "vitest";
import { canTransition, type OrderStatus } from "./orderStatus";

const ALL: OrderStatus[] = ["COLLECTING", "SUBMITTED", "ACCEPTED", "REJECTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

// Exactly the transitions listed in the spec. Everything else must be refused.
const VALID = new Set([
  "COLLECTING>SUBMITTED",
  "COLLECTING>CANCELLED",
  "SUBMITTED>ACCEPTED",
  "SUBMITTED>REJECTED",
  "SUBMITTED>CANCELLED",
  "ACCEPTED>PREPARING",
  "PREPARING>READY",
  "READY>COMPLETED",
]);

describe("canTransition", () => {
  for (const from of ALL) {
    for (const to of ALL) {
      const expected = VALID.has(`${from}>${to}`);
      it(`${from} → ${to} is ${expected ? "allowed" : "refused"}`, () => {
        expect(canTransition(from, to)).toBe(expected);
      });
    }
  }

  it("can't cancel after the restaurant accepts", () => {
    expect(canTransition("ACCEPTED", "CANCELLED")).toBe(false);
  });
});
