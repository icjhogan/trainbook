import { describe, expect, it } from "vitest";
import { buildExtractionPrompt } from "./extraction-prompt";

describe("buildExtractionPrompt", () => {
  it("instructs resolving undated pages to the anchor year when provided", () => {
    const p = buildExtractionPrompt(2025);
    expect(p).toContain("2025");
    expect(p).toContain("Resolve any date without an explicit year to 2025");
  });

  it("accepts a string anchor year", () => {
    expect(buildExtractionPrompt("2024")).toContain("2024");
  });

  it("tells the model NOT to assume the current year when no anchor is given", () => {
    const p = buildExtractionPrompt();
    expect(p).toContain("Do NOT assume the current year");
  });

  it("never bakes in the actual current year as a default", () => {
    const currentYear = String(new Date().getFullYear());
    const p = buildExtractionPrompt();
    // The no-anchor prompt must not silently hard-code this year as the assumption.
    expect(p).not.toContain(`assume the current year (${currentYear})`);
  });
});
