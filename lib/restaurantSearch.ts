// Filters and sorts restaurants for the /restaurants search page.
// v0.1 loads every restaurant and filters in memory — fine for a few hundred.
import { haversineMiles, type LatLng } from "@/lib/geo";

/** The fields search needs from each restaurant. */
export type SearchableRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  lat: number;
  lng: number;
  isSample: boolean;
  acceptsGroupOrders: boolean;
  minGroupSize: number;
  maxGroupSize: number | null;
};

export type SearchFilters = {
  text?: string; // matches name or cuisine
  maxMiles?: number; // undefined = any distance
  groupSize?: number; // "accepts group orders for at least N people"
  cuisine?: string; // exact cuisine from the dropdown
  showSamples: boolean; // from SHOW_SAMPLE_RESTAURANTS
};

export function searchRestaurants<R extends SearchableRestaurant>(
  restaurants: R[],
  center: LatLng,
  filters: SearchFilters,
): (R & { distanceMiles: number })[] {
  const text = filters.text?.trim().toLowerCase();
  const cuisine = filters.cuisine?.toLowerCase();

  return restaurants
    .filter((r) => r.acceptsGroupOrders) // this app is only for group orders
    .filter((r) => filters.showSamples || !r.isSample)
    .filter((r) => !text || r.name.toLowerCase().includes(text) || r.cuisine.toLowerCase().includes(text))
    .filter((r) => !cuisine || r.cuisine.toLowerCase() === cuisine)
    // A restaurant can take a group of N if N is between its min and max order size.
    .filter(
      (r) =>
        !filters.groupSize ||
        (r.minGroupSize <= filters.groupSize && (r.maxGroupSize == null || r.maxGroupSize >= filters.groupSize)),
    )
    .map((r) => ({ ...r, distanceMiles: haversineMiles(center, r) }))
    .filter((r) => filters.maxMiles == null || r.distanceMiles <= filters.maxMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}

/** Reads SHOW_SAMPLE_RESTAURANTS from .env. Anything but "false" shows them. */
export function showSampleRestaurants(): boolean {
  return process.env.SHOW_SAMPLE_RESTAURANTS?.trim().toLowerCase() !== "false";
}

/** The default map center from .env (falls back to Austin, TX). */
export function defaultCenter(): LatLng {
  const lat = Number(process.env.DEFAULT_LAT);
  const lng = Number(process.env.DEFAULT_LNG);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : { lat: 30.2672, lng: -97.7431 };
}
