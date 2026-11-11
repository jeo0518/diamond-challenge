import { describe, expect, it } from "vitest";
import { calculatePrice, type PricingLine, type PricingRules } from "./pricing";

const rules: PricingRules = {
  tiers: [
    { minQuantity: 20, discountPercent: 5 },
    { minQuantity: 50, discountPercent: 10 },
    { minQuantity: 100, discountPercent: 15 },
  ],
  serviceFee: 500,
  deliveryFee: 1500,
};

const line = (menuItemId: string, quantity: number, extra: Partial<PricingLine> = {}): PricingLine => ({
  menuItemId,
  quantity,
  basePrice: 1000,
  optionsDelta: 0,
  bulkPrice: null,
  bulkMinQty: null,
  ...extra,
});

describe("calculatePrice", () => {
  it("no tier: below the lowest threshold, no discount", () => {
    const r = calculatePrice([line("a", 19)], rules, "PICKUP");
    expect(r.totalQty).toBe(19);
    expect(r.subtotal).toBe(19000);
    expect(r.tier).toBeNull();
    expect(r.discount).toBe(0);
    expect(r.fees).toBe(500);
    expect(r.total).toBe(19500);
  });

  it("exactly at a tier threshold gets that tier", () => {
    const r = calculatePrice([line("a", 10), line("b", 10)], rules, "PICKUP");
    expect(r.totalQty).toBe(20);
    expect(r.tier?.discountPercent).toBe(5);
    expect(r.discount).toBe(1000); // 5% of $200
    expect(r.total).toBe(20000 - 1000 + 500);
  });

  it("uses the highest qualifying tier", () => {
    const r = calculatePrice([line("a", 50)], rules, "PICKUP");
    expect(r.tier?.discountPercent).toBe(10);
    expect(r.discount).toBe(5000);
  });

  it("bulk price override applies per item total, and the tier discount does not stack on it", () => {
    // Pizza: $18, or $14 when the order has 10+ pizzas. Two people order 6 + 4 = 10.
    const pizza = { basePrice: 1800, bulkPrice: 1400, bulkMinQty: 10 };
    const lines = [line("pizza", 6, pizza), line("pizza", 4, pizza), line("soda", 15, { basePrice: 200 })];
    const r = calculatePrice(lines, rules, "PICKUP");
    expect(r.lines[0].usedBulkPrice).toBe(true);
    expect(r.lines[0].lineTotal).toBe(6 * 1400);
    expect(r.lines[1].lineTotal).toBe(4 * 1400);
    expect(r.subtotal).toBe(14000 + 3000);
    expect(r.totalQty).toBe(25); // qualifies for 5%
    expect(r.discount).toBe(150); // 5% of the sodas only ($30), not the pizzas
    expect(r.total).toBe(17000 - 150 + 500);
  });

  it("bulk price does not apply below its minimum quantity", () => {
    const pizza = { basePrice: 1800, bulkPrice: 1400, bulkMinQty: 10 };
    const r = calculatePrice([line("pizza", 9, pizza)], rules, "PICKUP");
    expect(r.lines[0].usedBulkPrice).toBe(false);
    expect(r.subtotal).toBe(9 * 1800);
  });

  it("adds the delivery fee only for delivery", () => {
    expect(calculatePrice([line("a", 1)], rules, "DELIVERY").fees).toBe(2000);
    expect(calculatePrice([line("a", 1)], rules, "PICKUP").fees).toBe(500);
    const noFees = calculatePrice([line("a", 1)], { tiers: [], serviceFee: null, deliveryFee: null }, "DELIVERY");
    expect(noFees.fees).toBe(0);
  });

  it("option price deltas are added to the unit price before multiplying", () => {
    // $10 burger + Large (+$2) + Bacon (+$1.50) = $13.50 each × 3
    const r = calculatePrice([line("burger", 3, { optionsDelta: 350 })], rules, "PICKUP");
    expect(r.lines[0].lineUnit).toBe(1350);
    expect(r.lines[0].lineTotal).toBe(4050);
    expect(r.subtotal).toBe(4050);
  });

  it("rounds the discount to the nearest cent", () => {
    // 21 × $3.33 = $69.93; 5% = 349.65¢ → 350¢
    const r = calculatePrice([line("a", 21, { basePrice: 333 })], rules, "PICKUP");
    expect(r.discount).toBe(350);
  });

  it("handles an empty order", () => {
    const r = calculatePrice([], rules, "PICKUP");
    expect(r).toMatchObject({ subtotal: 0, totalQty: 0, discount: 0, tier: null, total: 500 });
  });
});
