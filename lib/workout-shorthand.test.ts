import { describe, expect, it } from "vitest";
import { parseWorkoutShorthand } from "./workout-shorthand";

describe("parseWorkoutShorthand", () => {
  it("parses reps x distance @ pace", () => {
    const { exercises } = parseWorkoutShorthand("4x350 @55");
    expect(exercises).toHaveLength(1);
    expect(exercises[0]).toMatchObject({ reps: 4, distance: "350m", times: ["55"] });
  });

  it("ignores a trailing s on the distance (4x350s)", () => {
    const { exercises } = parseWorkoutShorthand("4x350s @ 55");
    expect(exercises[0]).toMatchObject({ reps: 4, distance: "350m", times: ["55"] });
  });

  it("parses a single distance @ time", () => {
    const { exercises } = parseWorkoutShorthand("600 @ 2:03");
    expect(exercises[0]).toMatchObject({ reps: 1, distance: "600m", times: ["2:03"] });
  });

  it("parses sets x reps x distance", () => {
    const { exercises } = parseWorkoutShorthand("2x4x200");
    expect(exercises[0]).toMatchObject({ sets: 2, reps: 4, distance: "200m" });
  });

  it("parses combo distances with multiple times", () => {
    const { exercises } = parseWorkoutShorthand("300 + 300 @ 53.9 & 57.4");
    expect(exercises[0]).toMatchObject({
      distance: "300m + 300m",
      times: ["53.9", "57.4"],
    });
  });

  it("extracts a known workout type prefix", () => {
    const { workoutType, exercises } = parseWorkoutShorthand("Tempo: 400 @ 70");
    expect(workoutType).toBe("Tempo");
    expect(exercises[0]).toMatchObject({ reps: 1, distance: "400m", times: ["70"] });
  });

  it("does NOT treat a non-type prefix (HJ) as a workout type — keeps it as a description", () => {
    const { workoutType, exercises } = parseWorkoutShorthand("HJ: 8 step");
    expect(workoutType).toBeUndefined();
    expect(exercises).toHaveLength(1);
    expect(exercises[0].description).toBe("HJ: 8 step");
    expect(exercises[0].distance).toBeNull();
  });

  it("does not misread a small non-distance number as meters (8 step)", () => {
    const { exercises } = parseWorkoutShorthand("8 step approach");
    expect(exercises[0].distance).toBeNull();
    expect(exercises[0].description).toBe("8 step approach");
  });

  it("captures an explicit rest token", () => {
    const { exercises } = parseWorkoutShorthand("4x300 @55 r6min");
    expect(exercises[0]).toMatchObject({ reps: 4, distance: "300m", rest: "6min" });
  });

  it("splits multiple exercises on semicolons", () => {
    const { exercises } = parseWorkoutShorthand("4x300 @55; 2x150 @19");
    expect(exercises).toHaveLength(2);
    expect(exercises[0]).toMatchObject({ reps: 4, distance: "300m" });
    expect(exercises[1]).toMatchObject({ reps: 2, distance: "150m" });
  });

  it("preserves the raw text as description and never drops a segment", () => {
    const { exercises } = parseWorkoutShorthand("something totally freeform");
    expect(exercises).toHaveLength(1);
    expect(exercises[0].description).toBe("something totally freeform");
    expect(exercises[0].distance).toBeNull();
    expect(exercises[0].reps).toBeNull();
  });

  it("returns no exercises for empty input, no throw", () => {
    expect(parseWorkoutShorthand("").exercises).toEqual([]);
    expect(parseWorkoutShorthand("   ").exercises).toEqual([]);
  });

  it("always conforms to the Exercise shape (all fields present)", () => {
    const { exercises } = parseWorkoutShorthand("4x300 @55");
    const ex = exercises[0];
    expect(ex).toHaveProperty("description");
    expect(ex).toHaveProperty("distance");
    expect(ex).toHaveProperty("reps");
    expect(ex).toHaveProperty("sets");
    expect(ex).toHaveProperty("times");
    expect(ex).toHaveProperty("rest");
    expect(ex).toHaveProperty("notes");
  });
});
