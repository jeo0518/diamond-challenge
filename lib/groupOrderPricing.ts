// Prices a whole group order from its saved lines, using lib/pricing.ts (spec Section 10).
import { calculatePrice, type Fulfillment, type PriceBreakdown } from "@/lib/pricing";
import { readOptions } from "@/lib/orderLines";

type Line = { menuItemId: string; quantity: number; unitPriceSnapshot: number; selectedOptionsSnapshot: unknown };
type BulkRule = { bulkPrice: number | null; bulkMinQty: number | null };
type RestaurantPricing = {
  discountTiers: { minQuantity: number; discountPercent: number }[];
  serviceFee: number | null;
  deliveryFee: number | null;
};

/**
 * Base prices and options come from each line's snapshot (what people saw when they ordered).
 * Bulk overrides, discount tiers, and fees come from the restaurant's current settings.
 */
export function priceGroupOrder(
  lines: Line[],
  bulkRules: Map<string, BulkRule>,
  restaurant: RestaurantPricing,
  fulfillment: Fulfillment,
): PriceBreakdown {
  return calculatePrice(
    lines.map((l) => ({
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      basePrice: l.unitPriceSnapshot,
      optionsDelta: readOptions(l.selectedOptionsSnapshot).reduce((sum, o) => sum + o.priceDelta, 0),
      bulkPrice: bulkRules.get(l.menuItemId)?.bulkPrice ?? null,
      bulkMinQty: bulkRules.get(l.menuItemId)?.bulkMinQty ?? null,
    })),
    { tiers: restaurant.discountTiers, serviceFee: restaurant.serviceFee, deliveryFee: restaurant.deliveryFee },
    fulfillment,
  );
}
