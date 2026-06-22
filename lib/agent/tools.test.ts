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
  semanticSearch,
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
    async hybridSearch({ queryText, limit = 10 }) {
      // Fake "semantic" match: substring over a few fields, returned as scored hits.
      const q = queryText.toLowerCase();
      const hits = corpus
        .filter((w) =>
          [w.workout_type, ...(w.event_focus || []), w.personal_notes || ""].join(" ").toLowerCase().includes(q),
        )
        .slice(0, limit)
        .map((w, i) => ({
          id: w.id, date: w.date, date_iso: w.date_iso, workout_type: w.workout_type,
          event_focus: w.event_focus, exercises: w.exercises, technical_cues: w.technical_cues,
          personal_notes: w.personal_notes, score: 1 - i * 0.1,
        }));
      return { hits, degraded: false };
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

  it("clamps a 0 limit up to 1", async () => {
    const r = await searchWorkouts(fakeReader(corpus), { limit: 0 });
    expect(r.returned).toBe(1);
  });

  it("exposes per-exercise notes and workout flags to the agent", async () => {
    const reader = fakeReader([
      wk({ id: "n", flags: ["distance uncertain"], exercises: [ex({ description: "hurdles", notes: "left lead leg" })] }),
    ]);
    const r = await searchWorkouts(reader, {});
    expect(r.workouts[0].flags).toEqual(["distance uncertain"]);
    expect(r.workouts[0].exercises[0].notes).toBe("left lead leg");
  });
});

describe("get_workout", () => {
  it("returns full detail + citation by id", async () => {
    const r = await getWorkout(fakeReader(corpus), { id: "a" });
    expect(r.found).toBe(true);
    if (r.found) expect(r.citations[0].id).toBe("a");
  });
  it("finds by date_iso", async () => {
    const r = await getWorkout(fakeReader(corpus), { date_iso: "2026-02-15" });
    expect(r.found).toBe(true);
    if (r.found) expect(r.citations[0].id).toBe("b");
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

  it("dispatches weekly_volume and event_coverage through the tool layer", async () => {
    const wv = (await computeMetricTool(fakeReader(corpus), { metric: "weekly_volume" })) as { weeks: unknown[] };
    expect(Array.isArray(wv.weeks)).toBe(true);
    const ec = (await computeMetricTool(fakeReader(corpus), { metric: "event_coverage" })) as {
      events: { event: string }[];
    };
    expect(ec.events.some((e) => e.event === "Hurdles")).toBe(true);
  });
});

describe("event_coverage", () => {
  it("counts practice sessions per event", async () => {
    const r = (await eventCoverageTool(fakeReader(corpus), {})) as { events: { event: string; count: number }[] };
    expect(r.events.find((e) => e.event === "Hurdles")?.count).toBe(1); // plan excluded
  });
});

describe("semantic_search", () => {
  it("returns scored hits with citations and a degraded flag", async () => {
    const r = await semanticSearch(fakeReader(corpus), { query: "hurdles" });
    expect(r.degraded).toBe(false);
    expect(r.returned).toBeGreaterThan(0);
    expect(r.citations.every((c) => typeof c.id === "string")).toBe(true);
  });

  it("surfaces degraded=true when the reader reports keyword-only fallback", async () => {
    const degradedReader: ScopedWorkoutReader = {
      ...fakeReader(corpus),
      async hybridSearch() {
        return { hits: [], degraded: true };
      },
    };
    const r = await semanticSearch(degradedReader, { query: "anything" });
    expect(r.degraded).toBe(true);
  });
});

describe("tool registry", () => {
  it("exposes 5 read tools with schemas + handlers", () => {
    expect(toolDefinitions.map((t) => t.name).sort()).toEqual([
      "compute_metric",
      "event_coverage",
      "get_workout",
      "search_workouts",
      "semantic_search",
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
