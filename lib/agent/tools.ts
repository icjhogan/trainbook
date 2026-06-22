import type { Workout } from "@/lib/types";
import type { ScopedWorkoutReader } from "./reader";
import {
  computeMetric,
  eventCoverage,
  type MetricName,
  type MetricFilter,
} from "@/lib/workout-metrics";

// Transport-agnostic read/compute tool layer (R8/KTD5). Each tool is a pure async function of
// (reader, args) -> structured result. NO imports of `ai`, Next, or the Supabase client — the
// in-app AI-SDK adapter (U5) and a future MCP server both consume `toolDefinitions` below.
// Every result carries `citations` so the assistant can ground claims in real sessions, and
// the UI can validate model-emitted ids against them (KTD7).

export interface Citation {
  id: string;
  date: string;
  date_iso: string;
}

function cite(w: Workout): Citation {
  return { id: w.id, date: w.date, date_iso: w.date_iso };
}

// Compact view for list/search results — enough for the model to reason and cite without the
// full record. get_workout returns the complete detail.
function summarize(w: Workout) {
  return {
    id: w.id,
    date: w.date,
    date_iso: w.date_iso,
    workout_type: w.workout_type,
    event_focus: w.event_focus,
    exercises: (w.exercises || []).map((e) => ({
      description: e.description,
      distance: e.distance,
      reps: e.reps,
      sets: e.sets,
      times: e.times,
      rest: e.rest,
    })),
    technical_cues: w.technical_cues,
    personal_notes: w.personal_notes,
  };
}

interface RangeArgs {
  from?: string;
  to?: string;
  event?: string;
  type?: string;
}

function toFilter(args: RangeArgs): MetricFilter {
  return {
    range: args.from || args.to ? { from: args.from, to: args.to } : undefined,
    event: args.event,
    type: args.type,
  };
}

export async function searchWorkouts(
  reader: ScopedWorkoutReader,
  args: RangeArgs & { limit?: number },
) {
  const rows = await reader.listWorkouts(toFilter(args));
  const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
  const shown = rows.slice(0, limit);
  return {
    total: rows.length,
    returned: shown.length,
    workouts: shown.map(summarize),
    citations: shown.map(cite),
  };
}

export async function getWorkout(
  reader: ScopedWorkoutReader,
  args: { id?: string; date_iso?: string },
) {
  const w = await reader.getWorkout(args);
  if (!w) return { found: false as const };
  return { found: true as const, workout: summarize(w), citations: [cite(w)] };
}

export async function computeMetricTool(
  reader: ScopedWorkoutReader,
  args: RangeArgs & { metric: MetricName },
) {
  const rows = await reader.listWorkouts();
  // computeMetric applies the range/event/type filter itself so the metric definition (and
  // its practice-only vs all-workouts behavior) stays the single source of truth (U1/KTD4).
  return computeMetric(args.metric, rows, toFilter(args));
}

export async function eventCoverageTool(reader: ScopedWorkoutReader, args: RangeArgs) {
  const rows = await reader.listWorkouts();
  return { events: eventCoverage(rows, toFilter(args)) };
}

// Declarative, transport-agnostic tool registry. `inputSchema` is plain JSON Schema (no zod
// dependency); adapters wrap each `handler`. Descriptions are written for the model.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (reader: ScopedWorkoutReader, args: Record<string, unknown>) => Promise<unknown>;
}

const rangeProps = {
  from: { type: "string", description: "Inclusive start date, YYYY-MM-DD." },
  to: { type: "string", description: "Inclusive end date, YYYY-MM-DD." },
  event: { type: "string", description: "Filter to a heptathlon event in event_focus, e.g. 'Hurdles', 'High Jump'." },
  type: { type: "string", description: "Filter to a workout_type, e.g. 'Practice'." },
};

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "search_workouts",
    description:
      "Find training sessions by structured filters (date range, event, type), newest first. Use for 'how many', 'list', 'when did I' questions. Returns compact session summaries with ids for citation.",
    inputSchema: {
      type: "object",
      properties: { ...rangeProps, limit: { type: "number", description: "Max sessions to return (default 25)." } },
      additionalProperties: false,
    },
    handler: (reader, args) => searchWorkouts(reader, args as RangeArgs & { limit?: number }),
  },
  {
    name: "get_workout",
    description:
      "Fetch one full training session by its id or by ISO date (YYYY-MM-DD). Use after search/semantic_search to inspect a specific session in detail.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Workout id." },
        date_iso: { type: "string", description: "Session date, YYYY-MM-DD." },
      },
      additionalProperties: false,
    },
    handler: (reader, args) => getWorkout(reader, args as { id?: string; date_iso?: string }),
  },
  {
    name: "compute_metric",
    description:
      "Compute an exact training metric over the full log (never estimate numbers yourself). 'volume' = total running meters; 'weekly_volume' = meters per week; 'event_coverage' = sessions per event; 'session_count' = number of practice sessions. Optionally filtered by date/event/type. Returns the number(s) plus the contributing session ids.",
    inputSchema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["volume", "weekly_volume", "event_coverage", "session_count"],
          description: "Which metric to compute.",
        },
        ...rangeProps,
      },
      required: ["metric"],
      additionalProperties: false,
    },
    handler: (reader, args) => computeMetricTool(reader, args as RangeArgs & { metric: MetricName }),
  },
  {
    name: "event_coverage",
    description:
      "How much each heptathlon event has been trained (session counts + last-trained date), optionally within a date range. Use for balance/neglect questions.",
    inputSchema: { type: "object", properties: { ...rangeProps }, additionalProperties: false },
    handler: (reader, args) => eventCoverageTool(reader, args as RangeArgs),
  },
];
