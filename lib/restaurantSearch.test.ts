import { describe, expect, it } from "vitest";
import { searchRestaurants, type SearchableRestaurant } from "./restaurantSearch";

const center = { lat: 30, lng: -97 };
// Each 0.01° of latitude ≈ 0.69 mi north of the center.
const make = (id: string, latOffset: number, extra: Partial<SearchableRestaurant> = {}): SearchableRestaurant => ({
  id,
  name: `Place ${id}`,
  cuisine: "Pizza",
  lat: center.lat + latOffset,
  lng: center.lng,
  isSample: false,
  acceptsGroupOrders: true,
  minGroupSize: 10,
  maxGroupSize: null,
  ...extra,
});

describe("searchRestaurants", () => {
  const list = [
    make("far", 0.2), // ~13.8 mi
    make("near", 0.01), // ~0.7 mi
    make("mid", 0.05, { cuisine: "Mexican", name: "Taco Town" }), // ~3.5 mi
    make("sample", 0.02, { isSample: true }),
    make("closed", 0.0, { acceptsGroupOrders: false }),
    make("small", 0.03, { minGroupSize: 5, maxGroupSize: 30 }),
  ];

  it("sorts by distance and hides restaurants not taking group orders", () => {
    const ids = searchRestaurants(list, center, { showSamples: true }).map((r) => r.id);
    expect(ids).toEqual(["near", "sample", "small", "mid", "far"]);
  });

  it("hides samples when showSamples is false", () => {
    const ids = searchRestaurants(list, center, { showSamples: false }).map((r) => r.id);
    expect(ids).not.toContain("sample");
  });

  it("filters by max distance", () => {
    const ids = searchRestaurants(list, center, { showSamples: true, maxMiles: 5 }).map((r) => r.id);
    expect(ids).not.toContain("far");
    expect(ids).toContain("mid");
  });

  it("filters by text in name or cuisine, and by cuisine dropdown", () => {
    expect(searchRestaurants(list, center, { showSamples: true, text: "taco" }).map((r) => r.id)).toEqual(["mid"]);
    expect(searchRestaurants(list, center, { showSamples: true, text: "mexican" }).map((r) => r.id)).toEqual(["mid"]);
    expect(searchRestaurants(list, center, { showSamples: true, cuisine: "Mexican" }).map((r) => r.id)).toEqual(["mid"]);
  });

  it("filters by group size using min and max order size", () => {
    // 40 people: "small" (max 30) can't take it.
    const big = searchRestaurants(list, center, { showSamples: true, groupSize: 40 }).map((r) => r.id);
    expect(big).not.toContain("small");
    // 6 people: only "small" (min 5) can take it; others need 10+.
    const tiny = searchRestaurants(list, center, { showSamples: true, groupSize: 6 }).map((r) => r.id);
    expect(tiny).toEqual(["small"]);
  });
});
