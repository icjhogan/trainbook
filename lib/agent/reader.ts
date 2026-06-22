import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workout } from "@/lib/types";
import { filterWorkouts, type MetricFilter } from "@/lib/workout-metrics";
import { embedText } from "@/lib/embeddings";

// The data-access seam the tool layer depends on. Tools receive a ScopedWorkoutReader and
// never construct or import a Supabase client themselves — so they have no Next-request,
// HTTP, or DB-client coupling (R8/KTD5). v1 ships a cookie-session-scoped Supabase impl; a
// future MCP server provides a token-scoped impl of the SAME interface. Whatever the impl,
// it is RLS-scoped to one user (KTD6) — the reader can only ever see that user's rows.
// A hybrid-search hit: a compact session plus its fused RRF score. No embedding.
export interface SemanticHit {
  id: string;
  date: string;
  date_iso: string;
  workout_type: string;
  event_focus: string[];
  exercises: Workout["exercises"];
  technical_cues: string[];
  personal_notes: string | null;
  score: number;
}

export interface ScopedWorkoutReader {
  /** All of the user's workouts (optionally filtered), newest first. Excludes the embedding. */
  listWorkouts(filter?: MetricFilter): Promise<Workout[]>;
  /** A single workout by id or by ISO date. Null if not found / not owned. */
  getWorkout(opts: { id?: string; date_iso?: string }): Promise<Workout | null>;
  /**
   * Hybrid semantic + full-text search over the full corpus (RRF). The reader embeds the
   * query itself (keeping the embedding/infra dependency out of the pure tool core); if the
   * embedding call fails it degrades to keyword-only and reports `degraded: true`.
   */
  hybridSearch(opts: {
    queryText: string;
    limit?: number;
  }): Promise<{ hits: SemanticHit[]; degraded: boolean }>;
}

// Columns the tool layer reads. Deliberately excludes `embedding` (large, never shown to the
// model). Matches the Workout shape minus the vector.
const READ_COLUMNS =
  "id, user_id, date, date_iso, workout_type, event_focus, exercises, technical_cues, personal_notes, raw_text, flags, image_path, created_at, updated_at";

// Cookie-session-scoped reader. The caller passes an already-RLS-bound Supabase client
// (built from the request's auth cookies) plus the authenticated user's id; RLS policies
// (auth.uid() = user_id) restrict every query to that user, and userId is passed to the RRF
// function as belt-and-suspenders scoping.
export function createSupabaseReader(supabase: SupabaseClient, userId: string): ScopedWorkoutReader {
  return {
    async listWorkouts(filter) {
      const { data, error } = await supabase
        .from("workouts")
        .select(READ_COLUMNS)
        .order("date_iso", { ascending: false })
        .limit(1000);
      if (error) throw new Error(`listWorkouts failed: ${error.message}`);
      const rows = (data || []) as unknown as Workout[];
      // Structured filtering (date range / event / type) is applied in TS via the shared
      // metrics filter so it stays identical to how metrics narrow the same corpus.
      return filter ? filterWorkouts(rows, filter) : rows;
    },

    async getWorkout({ id, date_iso }) {
      if (!id && !date_iso) return null;
      let q = supabase.from("workouts").select(READ_COLUMNS);
      // Deterministic when a date has multiple sessions (two-a-days): oldest first.
      q = id ? q.eq("id", id) : q.eq("date_iso", date_iso!).order("created_at", { ascending: true });
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) throw new Error(`getWorkout failed: ${error.message}`);
      return (data as unknown as Workout) ?? null;
    },

    async hybridSearch({ queryText, limit = 10 }) {
      // Embed the query; on failure fall back to keyword-only (null embedding) and flag it.
      let queryEmbedding: number[] | null = null;
      let degraded = false;
      try {
        queryEmbedding = await embedText(queryText);
      } catch (err) {
        console.error("[hybridSearch] query embedding failed, keyword-only:", err);
        degraded = true;
      }
      const { data, error } = await supabase.rpc("hybrid_search", {
        p_user_id: userId,
        p_query_text: queryText,
        p_query_embedding: queryEmbedding,
        p_match_count: limit,
      });
      if (error) throw new Error(`hybridSearch failed: ${error.message}`);
      return { hits: (data || []) as SemanticHit[], degraded };
    },
  };
}
