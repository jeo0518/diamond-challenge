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

/**
 * Money for an order page: frozen totals once submitted, a live estimate while collecting.
 * Also returns each person's item total (with bulk prices) for the split-cost view.
 */
export function orderMoney(order: {
  status: string;
  submittedAt: Date | null;
  fulfillment: Fulfillment;
  subtotalCents: number;
  discountCents: number;
  feesCents: number;
  totalCents: number;
  lines: (Parameters<typeof priceGroupOrder>[0][number] & {
    participantName: string;
    menuItem: { bulkPrice: number | null; bulkMinQty: number | null };
  })[];
  restaurant: Parameters<typeof priceGroupOrder>[2];
}) {
  const bulkRules = new Map(order.lines.map((l) => [l.menuItemId, l.menuItem]));
  const live = priceGroupOrder(order.lines, bulkRules, order.restaurant, order.fulfillment);
  const perPerson = new Map<string, number>();
  order.lines.forEach((l, i) => perPerson.set(l.participantName, (perPerson.get(l.participantName) ?? 0) + live.lines[i].lineTotal));

  const frozen = order.submittedAt != null;
  return {
    isEstimate: !frozen,
    subtotal: frozen ? order.subtotalCents : live.subtotal,
    discount: frozen ? order.discountCents : live.discount,
    fees: frozen ? order.feesCents : live.fees,
    total: frozen ? order.totalCents : live.total,
    totalQty: live.totalQty,
    perPerson,
  };
}
