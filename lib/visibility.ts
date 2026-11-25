// Which restaurants customers can see: approved ones, and samples only when
// SHOW_SAMPLE_RESTAURANTS isn't "false". Use these everywhere customers find
// or order from restaurants, so the rule lives in one place.
import type { Prisma } from "@prisma/client";
import { showSampleRestaurants } from "@/lib/restaurantSearch";

/** Prisma `where` filter for restaurants customers may see. */
export function customerVisibleWhere(): Prisma.RestaurantWhereInput {
  return showSampleRestaurants() ? { isApproved: true } : { isApproved: true, isSample: false };
}

/** Same rule for a restaurant you already loaded. */
export function isVisibleToCustomers(r: { isApproved: boolean; isSample: boolean }): boolean {
  return r.isApproved && (!r.isSample || showSampleRestaurants());
}
