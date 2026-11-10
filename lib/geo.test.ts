import { describe, expect, it } from "vitest";
import { haversineMiles, isValidLatLng } from "./geo";

describe("haversineMiles", () => {
  it("is 0 for the same point", () => {
    expect(haversineMiles({ lat: 30.27, lng: -97.74 }, { lat: 30.27, lng: -97.74 })).toBe(0);
  });

  it("matches a known distance: New York to Los Angeles ≈ 2,445 mi", () => {
    const nyc = { lat: 40.7128, lng: -74.006 };
    const la = { lat: 34.0522, lng: -118.2437 };
    expect(haversineMiles(nyc, la)).toBeGreaterThan(2440);
    expect(haversineMiles(nyc, la)).toBeLessThan(2450);
  });

  it("one degree of latitude ≈ 69 mi", () => {
    expect(haversineMiles({ lat: 30, lng: -97 }, { lat: 31, lng: -97 })).toBeCloseTo(69.1, 0);
  });

  it("is the same in both directions", () => {
    const a = { lat: 30.2672, lng: -97.7431 };
    const b = { lat: 30.4, lng: -97.6 };
    expect(haversineMiles(a, b)).toBeCloseTo(haversineMiles(b, a), 10);
  });
});

describe("isValidLatLng", () => {
  it("accepts real coordinates and rejects bad ones", () => {
    expect(isValidLatLng(30.2, -97.7)).toBe(true);
    expect(isValidLatLng(91, 0)).toBe(false);
    expect(isValidLatLng(0, 181)).toBe(false);
    expect(isValidLatLng(NaN, 0)).toBe(false);
  });
});
