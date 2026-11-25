import { describe, expect, it } from "vitest";
import { splitCost } from "./splitCost";

const sum = (xs: { shareCents: number }[]) => xs.reduce((s, x) => s + x.shareCents, 0);

describe("splitCost", () => {
  it("splits in proportion to what each person ordered", () => {
    // $30 + $10 of items; total after discount + fees = $44 → $33 / $11
    const shares = splitCost(new Map([["Alice", 3000], ["Bob", 1000]]), 4400);
    expect(shares).toEqual([
      { person: "Alice", itemsCents: 3000, shareCents: 3300 },
      { person: "Bob", itemsCents: 1000, shareCents: 1100 },
    ]);
  });

  it("always adds up to the exact total, even with leftover cents", () => {
    const shares = splitCost(new Map([["A", 1000], ["B", 1000], ["C", 1000]]), 1000);
    expect(sum(shares)).toBe(1000);
    expect(shares.map((s) => s.shareCents).sort()).toEqual([333, 333, 334]);
  });

  it("works for odd amounts across many people", () => {
    const people = new Map(Array.from({ length: 7 }, (_, i) => [`P${i}`, 137 * (i + 1)] as [string, number]));
    expect(sum(splitCost(people, 98765))).toBe(98765);
  });

  it("handles empty orders", () => {
    expect(splitCost(new Map(), 500)).toEqual([]);
    expect(sum(splitCost(new Map([["A", 0], ["B", 0]]), 501))).toBe(501);
  });
});
