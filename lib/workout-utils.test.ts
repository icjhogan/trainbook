import { describe, expect, it } from "vitest";
import type { Exercise, Workout } from "./types";
import {
  buildSummary,
  calculateRunningVolume,
  getWeekKey,
  isValidDateIso,
  parseDistanceMeters,
  searchWorkouts,
} from "./workout-utils";

function exercise(partial: Partial<Exercise>): Exercise {
  return {
    description: "",
    distance: null,
    reps: null,
    sets: null,
    times: [],
    rest: null,
    notes: null,
    ...partial,
  };
}

function workout(partial: Partial<Workout>): Workout {
  return {
    id: "id",
    user_id: "u",
    date: "Mon, Nov 10",
    date_iso: "2025-11-10",
    workout_type: "Tempo",
    event_focus: [],
    exercises: [],
    technical_cues: [],
    personal_notes: null,
    raw_text: "",
    flags: [],
    image_path: null,
    embedding: null,
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

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

describe("parseDistanceMeters", () => {
  it("returns 0 for null/empty", () => {
    expect(parseDistanceMeters(null)).toBe(0);
    expect(parseDistanceMeters("")).toBe(0);
  });

  it("strips bracketed flag annotations", () => {
    expect(parseDistanceMeters("350m [?]")).toBe(350);
  });

  it("parses a single distance", () => {
    expect(parseDistanceMeters("600m")).toBe(600);
    expect(parseDistanceMeters("1000m")).toBe(1000);
  });

  it("sums every Nm token (combo distances) — documented behavior", () => {
    // calculateRunningVolume skips '+' combos; the raw parser sums both parts.
    expect(parseDistanceMeters("400m + 200m")).toBe(600);
  });

  it("returns 0 when there is no metre token", () => {
    expect(parseDistanceMeters("400")).toBe(0);
  });
});

describe("calculateRunningVolume", () => {
  it("multiplies distance * reps * sets", () => {
    expect(calculateRunningVolume([exercise({ distance: "300m", reps: 4, sets: 2 })])).toBe(2400);
  });

  it("defaults missing reps/sets to 1", () => {
    expect(calculateRunningVolume([exercise({ distance: "600m" })])).toBe(600);
  });

  it("skips '+' combo distances", () => {
    expect(calculateRunningVolume([exercise({ distance: "400m + 200m", reps: 2 })])).toBe(0);
  });

  it("sums across exercises", () => {
    expect(
      calculateRunningVolume([
        exercise({ distance: "200m", reps: 4 }),
        exercise({ distance: "100m", reps: 2 }),
      ]),
    ).toBe(1000);
  });
});

describe("buildSummary", () => {
  it("summarizes a minimal workout", () => {
    expect(buildSummary({ date: "Mon", workout_type: "Tempo" })).toBe("Mon: Tempo.");
  });

  it("includes event focus", () => {
    expect(buildSummary({ date: "Mon", workout_type: "Tempo", event_focus: ["200m"] })).toBe(
      "Mon: Tempo focusing on 200m.",
    );
  });

  it("appends exercise lines with times", () => {
    expect(
      buildSummary({
        date: "Mon",
        workout_type: "Speed",
        exercises: [exercise({ description: "4x300", times: ["45", "46"] })],
      }),
    ).toBe("Mon: Speed. 4x300 (times: 45, 46)");
  });

  it("appends an exercise line without a times suffix when there are no times", () => {
    expect(
      buildSummary({
        date: "Mon",
        workout_type: "Speed",
        exercises: [exercise({ description: "4x300" })],
      }),
    ).toBe("Mon: Speed. 4x300");
  });

  it("appends cues and notes", () => {
    expect(
      buildSummary({
        date: "Mon",
        workout_type: "Tempo",
        technical_cues: ["drive knees"],
        personal_notes: "felt strong",
      }),
    ).toBe("Mon: Tempo. Technical cues: drive knees Notes: felt strong");
  });
});

describe("searchWorkouts", () => {
  const ws = [
    workout({ id: "1", date: "Mon, Nov 10", workout_type: "Tempo", raw_text: "easy aerobic" }),
    workout({ id: "2", date: "Tue, Nov 11", workout_type: "Speed", exercises: [exercise({ description: "flying 30s" })] }),
    workout({ id: "3", date: "Wed, Nov 12", workout_type: "Hurdles", personal_notes: "left lead leg", event_focus: ["100mH"], technical_cues: ["snap the trail leg"] }),
  ];

  it("returns all workouts for an empty query", () => {
    expect(searchWorkouts(ws, "")).toBe(ws);
    expect(searchWorkouts(ws, "   ")).toBe(ws);
  });

  it("matches case-insensitively on workout_type", () => {
    expect(searchWorkouts(ws, "SPEED").map((w) => w.id)).toEqual(["2"]);
  });

  it("matches inside raw_text only", () => {
    expect(searchWorkouts(ws, "aerobic").map((w) => w.id)).toEqual(["1"]);
  });

  it("matches inside an exercise description only", () => {
    expect(searchWorkouts(ws, "flying").map((w) => w.id)).toEqual(["2"]);
  });

  it("matches inside personal_notes", () => {
    expect(searchWorkouts(ws, "lead").map((w) => w.id)).toEqual(["3"]);
  });

  it("matches inside event_focus", () => {
    expect(searchWorkouts(ws, "100mh").map((w) => w.id)).toEqual(["3"]);
  });

  it("matches inside technical_cues", () => {
    expect(searchWorkouts(ws, "trail leg").map((w) => w.id)).toEqual(["3"]);
  });

  it("matches inside the date field", () => {
    expect(searchWorkouts(ws, "nov 10").map((w) => w.id)).toEqual(["1"]);
  });

  it("returns nothing when no field matches", () => {
    expect(searchWorkouts(ws, "javelin")).toEqual([]);
  });
});
