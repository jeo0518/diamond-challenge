import { describe, expect, it } from "vitest";
import { copyLinesToCurrentMenu } from "./reorder";
import type { OrderableItem } from "./orderLines";

const pizza: OrderableItem = {
  id: "pizza",
  name: "Cheese Pizza",
  basePrice: 1900, // price went up from $18 since the old order
  isAvailable: true,
  isDeleted: false,
  optionGroups: [
    { id: "size", name: "Size", required: true, minSelect: 1, maxSelect: 1, options: [
      { id: "m", name: "Medium", priceDelta: 0 },
      { id: "l", name: "Large", priceDelta: 300 },
    ] },
  ],
};
const old = (extra: Partial<Parameters<typeof copyLinesToCurrentMenu>[0][number]>) => ({
  menuItemId: "pizza",
  itemNameSnapshot: "Cheese Pizza",
  participantName: "Alice",
  quantity: 2,
  selectedOptionsSnapshot: [{ group: "Size", option: "Large", priceDelta: 300 }],
  specialInstructions: "well done",
  ...extra,
});

describe("copyLinesToCurrentMenu", () => {
  it("copies lines with today's prices, keeping names, quantities, and notes", () => {
    const { copied, skipped } = copyLinesToCurrentMenu([old({})], new Map([["pizza", pizza]]));
    expect(skipped).toEqual([]);
    expect(copied).toEqual([{
      participantName: "Alice",
      menuItemId: "pizza",
      quantity: 2,
      specialInstructions: "well done",
      itemNameSnapshot: "Cheese Pizza",
      unitPriceSnapshot: 1900,
      selectedOptionsSnapshot: [{ group: "Size", option: "Large", priceDelta: 300 }],
    }]);
  });

  it("skips items that are gone or unavailable", () => {
    expect(copyLinesToCurrentMenu([old({})], new Map()).skipped).toEqual(["Cheese Pizza (Alice)"]);
    const off = new Map([["pizza", { ...pizza, isAvailable: false }]]);
    expect(copyLinesToCurrentMenu([old({})], off).skipped).toHaveLength(1);
  });

  it("skips lines whose option no longer exists or that now miss a required choice", () => {
    const gone = old({ selectedOptionsSnapshot: [{ group: "Size", option: "Huge", priceDelta: 500 }] });
    expect(copyLinesToCurrentMenu([gone], new Map([["pizza", pizza]])).skipped).toHaveLength(1);
    const noSize = old({ selectedOptionsSnapshot: [] });
    expect(copyLinesToCurrentMenu([noSize], new Map([["pizza", pizza]])).skipped).toHaveLength(1);
  });
});
