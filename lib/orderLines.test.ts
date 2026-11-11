import { describe, expect, it } from "vitest";
import { buildLineSnapshot, type OrderableItem } from "./orderLines";

const burger: OrderableItem = {
  id: "burger",
  name: "Burger",
  basePrice: 1000,
  isAvailable: true,
  isDeleted: false,
  optionGroups: [
    { id: "g1", name: "Size", required: true, minSelect: 1, maxSelect: 1, options: [
      { id: "small", name: "Small", priceDelta: 0 },
      { id: "large", name: "Large", priceDelta: 200 },
    ] },
    { id: "g2", name: "Add-ons", required: false, minSelect: 0, maxSelect: 2, options: [
      { id: "cheese", name: "Cheese", priceDelta: 100 },
      { id: "bacon", name: "Bacon", priceDelta: 150 },
      { id: "egg", name: "Egg", priceDelta: 125 },
    ] },
  ],
};

describe("buildLineSnapshot", () => {
  it("snapshots name, base price, and chosen options", () => {
    const r = buildLineSnapshot(burger, ["large", "bacon"]);
    expect(r).toEqual({
      ok: true,
      snapshot: {
        itemNameSnapshot: "Burger",
        unitPriceSnapshot: 1000,
        selectedOptionsSnapshot: [
          { group: "Size", option: "Large", priceDelta: 200 },
          { group: "Add-ons", option: "Bacon", priceDelta: 150 },
        ],
      },
    });
  });

  it("requires required groups", () => {
    expect(buildLineSnapshot(burger, ["cheese"])).toEqual({ ok: false, error: "Choose a size." });
  });

  it("enforces the max per group", () => {
    const r = buildLineSnapshot(burger, ["small", "cheese", "bacon", "egg"]);
    expect(r.ok).toBe(false);
  });

  it("rejects options from another item, duplicates, and unavailable items", () => {
    expect(buildLineSnapshot(burger, ["small", "pineapple"]).ok).toBe(false);
    expect(buildLineSnapshot(burger, ["small", "small"]).ok).toBe(false);
    expect(buildLineSnapshot({ ...burger, isAvailable: false }, ["small"]).ok).toBe(false);
  });
});
