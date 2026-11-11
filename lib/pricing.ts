// Group order pricing — implements spec Section 10 exactly.
// All amounts are integer CENTS. This runs on the server at submit time
// (never trust prices from the browser) and in the owner's price preview.

export type Fulfillment = "PICKUP" | "DELIVERY";

export type PricingLine = {
  menuItemId: string;
  quantity: number;
  basePrice: number; // cents
  optionsDelta: number; // cents: sum of the selected options' priceDelta
  bulkPrice: number | null; // cents: per-item bulk price override, if set
  bulkMinQty: number | null; // the override applies at this many of THIS item
};

export type PricingRules = {
  tiers: { minQuantity: number; discountPercent: number }[];
  serviceFee: number | null; // cents
  deliveryFee: number | null; // cents
};

export type PricedLine = PricingLine & {
  itemPrice: number; // basePrice or bulkPrice
  lineUnit: number; // itemPrice + options
  lineTotal: number; // lineUnit × quantity
  usedBulkPrice: boolean; // if true, the tier discount does NOT apply to this line
};

export type PriceBreakdown = {
  lines: PricedLine[];
  totalQty: number;
  subtotal: number;
  tier: { minQuantity: number; discountPercent: number } | null;
  discount: number;
  fees: number;
  total: number;
};

export function calculatePrice(lines: PricingLine[], rules: PricingRules, fulfillment: Fulfillment): PriceBreakdown {
  // How many of each menu item are in the whole order (across all participants).
  const qtyByItem = new Map<string, number>();
  for (const line of lines) {
    qtyByItem.set(line.menuItemId, (qtyByItem.get(line.menuItemId) ?? 0) + line.quantity);
  }

  const priced: PricedLine[] = lines.map((line) => {
    const usedBulkPrice =
      line.bulkPrice != null && line.bulkMinQty != null && (qtyByItem.get(line.menuItemId) ?? 0) >= line.bulkMinQty;
    const itemPrice = usedBulkPrice ? line.bulkPrice! : line.basePrice;
    const lineUnit = itemPrice + line.optionsDelta;
    return { ...line, itemPrice, lineUnit, lineTotal: lineUnit * line.quantity, usedBulkPrice };
  });

  const subtotal = sum(priced.map((l) => l.lineTotal));
  const totalQty = sum(priced.map((l) => l.quantity));

  // Highest tier the order qualifies for.
  const tier =
    [...rules.tiers]
      .filter((t) => t.minQuantity <= totalQty)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0] ?? null;

  // The tier discount only applies to lines that did NOT use a bulk price (no stacking).
  const eligible = sum(priced.filter((l) => !l.usedBulkPrice).map((l) => l.lineTotal));
  const discount = tier ? Math.round((eligible * tier.discountPercent) / 100) : 0;

  const fees = (rules.serviceFee ?? 0) + (fulfillment === "DELIVERY" ? (rules.deliveryFee ?? 0) : 0);

  return { lines: priced, totalQty, subtotal, tier, discount, fees, total: subtotal - discount + fees };
}

const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);
