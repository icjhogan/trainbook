import { describe, expect, it } from "vitest";
import { normalizeEventFocus, parseEventFocusInput } from "./event-focus";

describe("event focus input", () => {
  it("preserves a trailing space while a multi-word event is being typed", () => {
    expect(parseEventFocusInput("High ")).toEqual({
      draft: "High ",
      events: ["High"],
    });
    expect(parseEventFocusInput("200m, High ")).toEqual({
      draft: "200m, High ",
      events: ["200m", "High"],
    });
  });

  it("normalizes event values for persistence", () => {
    expect(normalizeEventFocus(["  High Jump ", "", " Shot Put  "])).toEqual([
      "High Jump",
      "Shot Put",
    ]);
  });
});
