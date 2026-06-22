import { describe, it, expect } from "vitest";
import { workoutEmbeddingText } from "./embeddings";
import type { ExtractedWorkout } from "./types";

function base(partial: Partial<ExtractedWorkout> = {}): ExtractedWorkout {
  return {
    date: "Monday, March 2",
    date_iso: "2026-03-02",
    workout_type: "Practice",
    event_focus: [],
    exercises: [],
    technical_cues: [],
    personal_notes: null,
    raw_text: "",
    flags: [],
    ...partial,
  };
}

describe("workoutEmbeddingText", () => {
  it("includes type, events, exercises, cues, and notes", () => {
    const text = workoutEmbeddingText(
      base({
        event_focus: ["Hurdles", "200m"],
        exercises: [
          { description: "4x300m", distance: "300m", reps: 4, sets: 1, times: ["55", "56"], rest: "3min", notes: "felt strong" },
        ],
        technical_cues: ["drive knee", "stay tall"],
        personal_notes: "right hamstring tight",
      }),
    );
    expect(text).toContain("Practice");
    expect(text).toContain("Hurdles, 200m");
    expect(text).toContain("4x300m");
    expect(text).toContain("55, 56");
    expect(text).toContain("felt strong");
    expect(text).toContain("Cues: drive knee; stay tall");
    expect(text).toContain("Notes: right hamstring tight");
  });

  it("produces non-empty, stable output even with no exercises/notes", () => {
    const w = base({ workout_type: "Reflection" });
    const a = workoutEmbeddingText(w);
    const b = workoutEmbeddingText(w);
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a).toContain("Reflection");
  });

  it("omits empty exercise lines", () => {
    const text = workoutEmbeddingText(
      base({ exercises: [{ description: "", distance: null, reps: null, sets: null, times: [], rest: null, notes: null }] }),
    );
    // Only the header line remains.
    expect(text.split("\n")).toHaveLength(1);
  });
});
