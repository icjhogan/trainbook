import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workout } from "@/lib/types";
import { filterWorkouts, type MetricFilter } from "@/lib/workout-metrics";

// The data-access seam the tool layer depends on. Tools receive a ScopedWorkoutReader and
// never construct or import a Supabase client themselves — so they have no Next-request,
// HTTP, or DB-client coupling (R8/KTD5). v1 ships a cookie-session-scoped Supabase impl; a
// future MCP server provides a token-scoped impl of the SAME interface. Whatever the impl,
// it is RLS-scoped to one user (KTD6) — the reader can only ever see that user's rows.
export interface ScopedWorkoutReader {
  /** All of the user's workouts (optionally filtered), newest first. Excludes the embedding. */
  listWorkouts(filter?: MetricFilter): Promise<Workout[]>;
  /** A single workout by id or by ISO date. Null if not found / not owned. */
  getWorkout(opts: { id?: string; date_iso?: string }): Promise<Workout | null>;
}

// Columns the tool layer reads. Deliberately excludes `embedding` (large, never shown to the
// model). Matches the Workout shape minus the vector.
const READ_COLUMNS =
  "id, user_id, date, date_iso, workout_type, event_focus, exercises, technical_cues, personal_notes, raw_text, flags, image_path, created_at, updated_at";

// Cookie-session-scoped reader. The caller passes an already-RLS-bound Supabase client
// (built from the request's auth cookies); RLS policies (auth.uid() = user_id) restrict every
// query to the authenticated user, so no explicit user_id filter is required here.
export function createSupabaseReader(supabase: SupabaseClient): ScopedWorkoutReader {
  return {
    async listWorkouts(filter) {
      const { data, error } = await supabase
        .from("workouts")
        .select(READ_COLUMNS)
        .order("date_iso", { ascending: false });
      if (error) throw new Error(`listWorkouts failed: ${error.message}`);
      const rows = (data || []) as unknown as Workout[];
      // Structured filtering (date range / event / type) is applied in TS via the shared
      // metrics filter so it stays identical to how metrics narrow the same corpus.
      return filter ? filterWorkouts(rows, filter) : rows;
    },

    async getWorkout({ id, date_iso }) {
      if (!id && !date_iso) return null;
      let q = supabase.from("workouts").select(READ_COLUMNS);
      q = id ? q.eq("id", id) : q.eq("date_iso", date_iso!);
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) throw new Error(`getWorkout failed: ${error.message}`);
      return (data as unknown as Workout) ?? null;
    },
  };
}
