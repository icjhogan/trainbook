import { describe, it, expect } from "vitest";
import type { Workout, Exercise } from "./types";
import { calculateRunningVolume, getWeekKey } from "./workout-utils";
import {
  totalVolume,
  weeklyVolume,
  eventCoverage,
  sessionCount,
  filterWorkouts,
  computeMetric,
} from "./workout-metrics";

let idc = 0;
function ex(partial: Partial<Exercise> = {}): Exercise {
  return { description: "run", distance: null, reps: null, sets: null, times: [], rest: null, notes: null, ...partial };
}
function wk(partial: Partial<Workout> = {}): Workout {
  idc += 1;
  return {
    id: `w${idc}`,
    user_id: "u1",
    date: "label",
    date_iso: "2026-03-01",
    workout_type: "Practice",
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

describe("totalVolume", () => {
  it("sums distance*reps*sets for matching workouts and returns contributing ids", () => {
    const a = wk({ id: "a", date_iso: "2026-03-05", exercises: [ex({ distance: "300m", reps: 4, sets: 1 })] }); // 1200
    const b = wk({ id: "b", date_iso: "2026-03-20", exercises: [ex({ distance: "200m", reps: 2, sets: 2 })] }); // 800
    const r = totalVolume([a, b]);
    expect(r.meters).toBe(2000);
    expect(r.citations.map((c) => c.id).sort()).toEqual(["a", "b"]);
    expect(r.sessionCount).toBe(2);
  });

  it("restricts to a date range (inclusive) — supports March-vs-Feb style questions", () => {
    const feb = wk({ date_iso: "2026-02-10", exercises: [ex({ distance: "300m", reps: 1, sets: 1 })] });
    const mar = wk({ date_iso: "2026-03-10", exercises: [ex({ distance: "300m", reps: 2, sets: 1 })] });
    const r = totalVolume([feb, mar], { range: { from: "2026-03-01", to: "2026-03-31" } });
    expect(r.meters).toBe(600);
    expect(r.citations).toHaveLength(1);
  });

  it("skips combo distances and excludes zero-volume workouts from citations", () => {
    const combo = wk({ id: "combo", exercises: [ex({ distance: "400m + 200m", reps: 1, sets: 1 })] });
    const rest = wk({ id: "rest", exercises: [ex({ description: "mobility" })] });
    const r = totalVolume([combo, rest]);
    expect(r.meters).toBe(0);
    expect(r.citations).toHaveLength(0);
  });
});

describe("eventCoverage", () => {
  it("counts practice sessions per event, tracks last trained, sorts by count", () => {
    const w1 = wk({ date_iso: "2026-03-01", event_focus: ["Hurdles", "200m"] });
    const w2 = wk({ date_iso: "2026-03-08", event_focus: ["Hurdles"] });
    const cov = eventCoverage([w1, w2]);
    expect(cov[0]).toMatchObject({ event: "Hurdles", count: 2, lastTrainedIso: "2026-03-08" });
    expect(cov.find((c) => c.event === "200m")?.count).toBe(1);
  });

  it("excludes non-practice types (Weekly Plan etc.) from coverage", () => {
    const plan = wk({ workout_type: "Weekly Plan", event_focus: ["Hurdles"] });
    const cov = eventCoverage([plan]);
    expect(cov).toHaveLength(0);
  });
});

describe("sessionCount", () => {
  it("counts practice workouts only by default", () => {
    const rows = [wk({}), wk({ workout_type: "Goals" }), wk({ workout_type: "Reflection" })];
    expect(sessionCount(rows).count).toBe(1);
  });
});

describe("filterWorkouts", () => {
  it("filters by event case-insensitively", () => {
    const rows = [wk({ event_focus: ["High Jump"] }), wk({ event_focus: ["200m"] })];
    expect(filterWorkouts(rows, { event: "high jump" })).toHaveLength(1);
  });

  it("filters by workout_type", () => {
    const rows = [wk({ workout_type: "Goals" }), wk({ workout_type: "Practice" })];
    expect(filterWorkouts(rows, { type: "Goals" })).toHaveLength(1);
  });

  it("excludes a workout with a malformed date_iso when a range is active", () => {
    const rows = [wk({ date_iso: "not-a-date", exercises: [ex({ distance: "300m", reps: 1, sets: 1 })] })];
    expect(totalVolume(rows, { range: { from: "2026-01-01", to: "2026-12-31" } }).meters).toBe(0);
  });
});

describe("weeklyVolume", () => {
  it("sums meters per Monday-anchored week", () => {
    const w1 = wk({ date_iso: "2026-03-02", exercises: [ex({ distance: "300m", reps: 4, sets: 1 })] }); // wk of Mar 2
    const w2 = wk({ date_iso: "2026-03-03", exercises: [ex({ distance: "200m", reps: 1, sets: 1 })] }); // same wk
    const w3 = wk({ date_iso: "2026-03-10", exercises: [ex({ distance: "100m", reps: 1, sets: 1 })] }); // next wk
    const weeks = weeklyVolume([w1, w2, w3]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].meters).toBe(1400); // 1200 + 200 in the first week
    expect(weeks[1].meters).toBe(100);
  });
});

describe("computeMetric dispatch", () => {
  it("routes volume / weekly_volume / event_coverage / session_count", () => {
    const rows = [wk({ event_focus: ["Hurdles"], exercises: [ex({ distance: "100m", reps: 1, sets: 1 })] })];
    expect(computeMetric("volume", rows)).toMatchObject({ name: "volume", meters: 100 });
    const weekly = computeMetric("weekly_volume", rows) as { weeks: { meters: number }[] };
    expect(weekly.weeks[0].meters).toBe(100);
    const cov = computeMetric("event_coverage", rows) as { events: { event: string; count: number }[] };
    expect(cov.events.find((e) => e.event === "Hurdles")?.count).toBe(1);
    expect(computeMetric("session_count", rows)).toMatchObject({ name: "session_count", count: 1 });
  });
});

// Parity guard: the metrics module must reproduce the dashboard's exact reductions so chat
// and dashboard never disagree (KTD4). These mirror dashboard-client.tsx's inline math.
describe("dashboard parity", () => {
  const corpus = [
    wk({ id: "p1", date_iso: "2026-03-02", event_focus: ["Hurdles"], exercises: [ex({ distance: "300m", reps: 4, sets: 1 })] }),
    wk({ id: "p2", date_iso: "2026-03-09", event_focus: ["200m"], exercises: [ex({ distance: "200m", reps: 6, sets: 1 })] }),
    wk({ id: "plan", date_iso: "2026-03-01", workout_type: "Weekly Plan", event_focus: ["Hurdles"], exercises: [] }),
  ];

  it("totalVolume matches the dashboard's all-workouts reduction", () => {
    const dash = corpus.reduce((s, w) => s + calculateRunningVolume(w.exercises || []), 0);
    expect(totalVolume(corpus).meters).toBe(dash);
  });

  it("session count matches the dashboard's practice-only filter", () => {
    const dashPractice = corpus.filter(
      (w) => !["Season Schedule", "Weekly Plan", "Goals", "Reflection", "Competition Cues"].includes(w.workout_type),
    ).length;
    expect(sessionCount(corpus).count).toBe(dashPractice);
  });

  it("weekly buckets align with getWeekKey", () => {
    const weeks = weeklyVolume(corpus).map((w) => w.week);
    expect(weeks).toContain(getWeekKey("2026-03-02"));
  });
});
