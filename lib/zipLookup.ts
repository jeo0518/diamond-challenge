// ⚠️ PLACEHOLDER: a tiny hard-coded table of ZIP codes and city names → coordinates.
// This lets people search by ZIP/city without a paid geocoding API.
// It only knows the places listed below. Replace it with a real
// geocoding service (or a full ZIP database) before launch.
import type { LatLng } from "@/lib/geo";

type Place = LatLng & { label: string };

const ZIPS: Record<string, Place> = {
  // Austin, TX area (matches the default center in .env.example)
  "78701": { lat: 30.2711, lng: -97.7437, label: "Austin, TX 78701" },
  "78704": { lat: 30.2428, lng: -97.7695, label: "Austin, TX 78704" },
  "78705": { lat: 30.2944, lng: -97.7404, label: "Austin, TX 78705" },
  "78745": { lat: 30.2063, lng: -97.7956, label: "Austin, TX 78745" },
  "78758": { lat: 30.3875, lng: -97.7064, label: "Austin, TX 78758" },
  // A few big cities elsewhere
  "10001": { lat: 40.7506, lng: -73.9972, label: "New York, NY 10001" },
  "60601": { lat: 41.8853, lng: -87.6216, label: "Chicago, IL 60601" },
  "94103": { lat: 37.7726, lng: -122.4099, label: "San Francisco, CA 94103" },
  "90012": { lat: 34.0614, lng: -118.2385, label: "Los Angeles, CA 90012" },
  "98101": { lat: 47.6114, lng: -122.3305, label: "Seattle, WA 98101" },
  "02108": { lat: 42.3576, lng: -71.0684, label: "Boston, MA 02108" },
  "30303": { lat: 33.7525, lng: -84.3888, label: "Atlanta, GA 30303" },
  "75201": { lat: 32.7876, lng: -96.7994, label: "Dallas, TX 75201" },
  "77002": { lat: 29.7568, lng: -95.3647, label: "Houston, TX 77002" },
};

const CITIES: Record<string, Place> = {
  austin: { lat: 30.2672, lng: -97.7431, label: "Austin, TX" },
  "new york": { lat: 40.7128, lng: -74.006, label: "New York, NY" },
  chicago: { lat: 41.8781, lng: -87.6298, label: "Chicago, IL" },
  "san francisco": { lat: 37.7749, lng: -122.4194, label: "San Francisco, CA" },
  "los angeles": { lat: 34.0522, lng: -118.2437, label: "Los Angeles, CA" },
  seattle: { lat: 47.6062, lng: -122.3321, label: "Seattle, WA" },
  boston: { lat: 42.3601, lng: -71.0589, label: "Boston, MA" },
  atlanta: { lat: 33.749, lng: -84.388, label: "Atlanta, GA" },
  dallas: { lat: 32.7767, lng: -96.797, label: "Dallas, TX" },
  houston: { lat: 29.7604, lng: -95.3698, label: "Houston, TX" },
};

/**
 * Look up a ZIP code ("78701") or city ("Austin", "austin, tx").
 * Returns null if it's not in the placeholder table.
 */
export function lookupPlace(input: string): Place | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;
  const zip = text.match(/^\d{5}/)?.[0]; // accepts "78701" and "78701-1234"
  if (zip) return ZIPS[zip] ?? null;
  const city = text.split(",")[0].trim(); // "austin, tx" → "austin"
  return CITIES[city] ?? null;
}

/** For hints in the UI: the example places this table knows about. */
export const KNOWN_PLACE_EXAMPLES = ["78701", "Austin", "10001", "Chicago"];
