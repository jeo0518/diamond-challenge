import { afterEach, describe, expect, it } from "vitest";
import { isAdmin, parseAdminEmails } from "./admin";
import { isVisibleToCustomers } from "./visibility";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("admins", () => {
  it("reads a comma-separated list, ignoring case and spaces", () => {
    expect(parseAdminEmails(" Coach@School.org, ,advisor@x.com ")).toEqual(["coach@school.org", "advisor@x.com"]);
    expect(parseAdminEmails(undefined)).toEqual([]);
  });

  it("only listed emails are admins", () => {
    process.env.ADMIN_EMAILS = "coach@school.org";
    expect(isAdmin({ email: "COACH@school.org" })).toBe(true);
    expect(isAdmin({ email: "someone@else.com" })).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("nobody is an admin when ADMIN_EMAILS is empty", () => {
    delete process.env.ADMIN_EMAILS;
    expect(isAdmin({ email: "coach@school.org" })).toBe(false);
  });
});

describe("restaurant visibility", () => {
  it("customers only see approved restaurants", () => {
    process.env.SHOW_SAMPLE_RESTAURANTS = "true";
    expect(isVisibleToCustomers({ isApproved: false, isSample: false })).toBe(false);
    expect(isVisibleToCustomers({ isApproved: true, isSample: false })).toBe(true);
  });

  it("samples also need SHOW_SAMPLE_RESTAURANTS", () => {
    process.env.SHOW_SAMPLE_RESTAURANTS = "false";
    expect(isVisibleToCustomers({ isApproved: true, isSample: true })).toBe(false);
    expect(isVisibleToCustomers({ isApproved: true, isSample: false })).toBe(true);
  });
});
