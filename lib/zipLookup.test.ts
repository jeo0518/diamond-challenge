import { describe, expect, it } from "vitest";
import { lookupPlace } from "./zipLookup";

describe("lookupPlace", () => {
  it("finds ZIP codes, including ZIP+4", () => {
    expect(lookupPlace("78701")?.label).toContain("Austin");
    expect(lookupPlace(" 78701-1234 ")?.label).toContain("Austin");
  });
  it("finds cities, ignoring case and state", () => {
    expect(lookupPlace("CHICAGO")?.label).toBe("Chicago, IL");
    expect(lookupPlace("austin, tx")?.label).toBe("Austin, TX");
  });
  it("returns null for unknown places", () => {
    expect(lookupPlace("99999")).toBeNull();
    expect(lookupPlace("Atlantis")).toBeNull();
    expect(lookupPlace("")).toBeNull();
  });
});
