import { describe, expect, it } from "vitest";
import { getWeekKey, isValidDateIso } from "./workout-utils";

describe("isValidDateIso", () => {
  it("accepts a well-formed real date", () => {
    expect(isValidDateIso("2026-04-04")).toBe(true);
  });

  it("rejects empty / null / undefined", () => {
    expect(isValidDateIso("")).toBe(false);
    expect(isValidDateIso(null)).toBe(false);
    expect(isValidDateIso(undefined)).toBe(false);
  });

  it("rejects malformed or impossible dates", () => {
    expect(isValidDateIso("not-a-date")).toBe(false);
    expect(isValidDateIso("2026-13-40")).toBe(false);
    expect(isValidDateIso("2026-4-4")).toBe(false); // not zero-padded
    expect(isValidDateIso("04/04/2026")).toBe(false);
  });
});

describe("getWeekKey", () => {
  it("returns the Monday of the week for a mid-week date", () => {
    // 2025-11-12 is a Wednesday -> Monday 2025-11-10
    expect(getWeekKey("2025-11-12")).toBe("2025-11-10");
  });

  it("maps a Sunday to the preceding Monday (not the next day)", () => {
    // 2025-11-16 is a Sunday -> Monday 2025-11-10
    expect(getWeekKey("2025-11-16")).toBe("2025-11-10");
  });

  it("maps a Monday to itself", () => {
    expect(getWeekKey("2025-11-10")).toBe("2025-11-10");
  });

  it("handles a year-boundary week", () => {
    // 2025-12-29 is a Monday
    expect(getWeekKey("2025-12-29")).toBe("2025-12-29");
    // 2026-01-01 is a Thursday -> Monday 2025-12-29
    expect(getWeekKey("2026-01-01")).toBe("2025-12-29");
  });

  it("returns null on invalid input instead of throwing", () => {
    expect(getWeekKey("")).toBeNull();
    expect(getWeekKey("not-a-date")).toBeNull();
    expect(getWeekKey("2026-13-40")).toBeNull();
  });
});
