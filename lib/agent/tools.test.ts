import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Workout, Exercise } from "@/lib/types";
import type { ScopedWorkoutReader } from "./reader";
import { filterWorkouts } from "@/lib/workout-metrics";
import {
  searchWorkouts,
  getWorkout,
  computeMetricTool,
  eventCoverageTool,
  toolDefinitions,
} from "./tools";

let idc = 0;
function ex(p: Partial<Exercise> = {}): Exercise {
  return { description: "run", distance: null, reps: null, sets: null, times: [], rest: null, notes: null, ...p };
}
function wk(p: Partial<Workout> = {}): Workout {
  idc += 1;
  return {
    id: `w${idc}`, user_id: "u1", date: "label", date_iso: "2026-03-01", workout_type: "Practice",
    event_focus: [], exercises: [], technical_cues: [], personal_notes: null, raw_text: "",
    flags: [], image_path: null, embedding: null, created_at: "", updated_at: "", ...p,
  };
}

// In-memory reader that mimics the RLS-scoped Supabase reader over a fixed corpus.
function fakeReader(corpus: Workout[]): ScopedWorkoutReader {
  return {
    async listWorkouts(filter) {
      return filter ? filterWorkouts(corpus, filter) : corpus;
    },
    async getWorkout({ id, date_iso }) {
      return corpus.find((w) => (id ? w.id === id : w.date_iso === date_iso)) ?? null;
    },
  };
}

const corpus = [
  wk({ id: "a", date_iso: "2026-03-02", event_focus: ["Hurdles"], exercises: [ex({ distance: "300m", reps: 4, sets: 1 })] }),
  wk({ id: "b", date_iso: "2026-02-15", event_focus: ["200m"], exercises: [ex({ distance: "200m", reps: 2, sets: 1 })] }),
  wk({ id: "c", date_iso: "2026-03-20", workout_type: "Weekly Plan", event_focus: ["Hurdles"] }),
];

describe("search_workouts", () => {
  it("filters by event and returns citations", async () => {
    const r = await searchWorkouts(fakeReader(corpus), { event: "Hurdles" });
    expect(r.total).toBe(2); // a (practice) + c (plan) both list Hurdles
    expect(r.citations.map((c) => c.id).sort()).toEqual(["a", "c"]);
  });

  it("filters by date range", async () => {
    const r = await searchWorkouts(fakeReader(corpus), { from: "2026-03-01", to: "2026-03-31" });
    expect(r.total).toBe(2);
  });

  it("returns empty (not error) when nothing matches", async () => {
    const r = await searchWorkouts(fakeReader(corpus), { event: "Javelin" });
    expect(r.total).toBe(0);
    expect(r.workouts).toEqual([]);
  });
});

describe("get_workout", () => {
  it("returns full detail + citation by id", async () => {
    const r = await getWorkout(fakeReader(corpus), { id: "a" });
    expect(r.found).toBe(true);
    if (r.found) expect(r.citations[0].id).toBe("a");
  });
  it("reports not found", async () => {
    const r = await getWorkout(fakeReader(corpus), { id: "zzz" });
    expect(r.found).toBe(false);
  });
});

describe("compute_metric", () => {
  it("computes volume with contributing ids via the shared metrics module", async () => {
    const r = (await computeMetricTool(fakeReader(corpus), { metric: "volume" })) as { meters: number; citations: unknown[] };
    expect(r.meters).toBe(1200 + 400); // a: 300*4, b: 200*2
    expect(r.citations).toHaveLength(2);
  });
  it("session_count excludes the Weekly Plan entry", async () => {
    const r = (await computeMetricTool(fakeReader(corpus), { metric: "session_count" })) as { count: number };
    expect(r.count).toBe(2);
  });
});

describe("event_coverage", () => {
  it("counts practice sessions per event", async () => {
    const r = (await eventCoverageTool(fakeReader(corpus), {})) as { events: { event: string; count: number }[] };
    expect(r.events.find((e) => e.event === "Hurdles")?.count).toBe(1); // plan excluded
  });
});

describe("tool registry", () => {
  it("exposes 4 read tools with schemas + handlers", () => {
    expect(toolDefinitions.map((t) => t.name).sort()).toEqual([
      "compute_metric",
      "event_coverage",
      "get_workout",
      "search_workouts",
    ]);
    for (const t of toolDefinitions) {
      expect(typeof t.handler).toBe("function");
      expect(t.inputSchema).toHaveProperty("type", "object");
    }
  });
});

// R8 / KTD5 guard: the tool core must stay transport-agnostic — no Supabase client, no `ai`
// SDK, no Next request types. If this fails, MCP extraction is no longer "just an adapter".
describe("transport-agnostic boundary", () => {
  it("tools.ts imports neither a Supabase client, the ai SDK, nor next", () => {
    const src = readFileSync(join(__dirname, "tools.ts"), "utf8");
    expect(src).not.toMatch(/@supabase\//);
    expect(src).not.toMatch(/supabase\/(server|client)/);
    expect(src).not.toMatch(/from\s+["']ai["']/);
    expect(src).not.toMatch(/from\s+["']next/);
  });
});
