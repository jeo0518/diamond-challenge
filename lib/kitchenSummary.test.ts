import { describe, expect, it } from "vitest";
import { kitchenSummary } from "./kitchenSummary";

const opt = (...names: string[]) => names.map((option) => ({ group: "g", option, priceDelta: 0 }));

describe("kitchenSummary", () => {
  it("adds up identical item + option combos across people", () => {
    const rows = kitchenSummary([
      { itemNameSnapshot: "Burrito", quantity: 20, selectedOptionsSnapshot: opt("Chicken", "Mild"), specialInstructions: null },
      { itemNameSnapshot: "Burrito", quantity: 3, selectedOptionsSnapshot: opt("Chicken", "Mild"), specialInstructions: null },
      { itemNameSnapshot: "Burrito", quantity: 5, selectedOptionsSnapshot: opt("Steak", "Hot"), specialInstructions: null },
      { itemNameSnapshot: "Chips", quantity: 2, selectedOptionsSnapshot: [], specialInstructions: null },
    ]);
    expect(rows).toEqual([
      { item: "Burrito", options: "Chicken, Mild", quantity: 23, notes: [] },
      { item: "Burrito", options: "Steak, Hot", quantity: 5, notes: [] },
      { item: "Chips", options: "", quantity: 2, notes: [] },
    ]);
  });

  it("keeps special instructions with counts", () => {
    const rows = kitchenSummary([
      { itemNameSnapshot: "Taco", quantity: 2, selectedOptionsSnapshot: [], specialInstructions: "no onions" },
      { itemNameSnapshot: "Taco", quantity: 1, selectedOptionsSnapshot: [], specialInstructions: "extra lime" },
    ]);
    expect(rows[0].quantity).toBe(3);
    expect(rows[0].notes).toEqual(["no onions (×2)", "extra lime"]);
  });
});
