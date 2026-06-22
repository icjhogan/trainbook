import { createClient } from "@/lib/supabase/server";
import { embedWorkout, type EmbeddingSource } from "@/lib/embeddings";
import { rateLimit } from "@/lib/rate-limit";

// Authenticated, RLS-scoped embedding backfill. Runs as the logged-in user (no service-role
// key needed — every row it can see is its own), so it both populates the initial corpus and
// re-embeds anything stale. Idempotent and re-runnable: selects only rows whose embedding is
// missing or older than the last edit (embedded_at is null OR updated_at > embedded_at).
export const maxDuration = 300;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Idempotent but embed-spending: cap repeated taps / multi-tab loops.
  const limit = rateLimit(`backfill:${user.id}`, 3, 60_000);
  if (!limit.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { data: rows, error } = await supabase
    .from("workouts")
    .select("id, date, workout_type, event_focus, exercises, technical_cues, personal_notes, embedding, embedded_at, updated_at")
    .eq("user_id", user.id);

  if (error) return new Response(error.message, { status: 500 });

  const stale = (rows || []).filter(
    (w) => w.embedding == null || w.embedded_at == null || (w.updated_at && w.embedded_at && w.updated_at > w.embedded_at),
  );

  let embedded = 0;
  const failures: string[] = [];
  for (const w of stale) {
    try {
      const embedding = await embedWorkout(w as unknown as EmbeddingSource);
      const { error: upErr } = await supabase
        .from("workouts")
        .update({ embedding, embedded_at: new Date().toISOString() })
        .eq("id", w.id);
      if (upErr) failures.push(w.id);
      else embedded += 1;
    } catch {
      failures.push(w.id);
    }
  }

  return Response.json({ total: rows?.length || 0, stale: stale.length, embedded, failed: failures.length });
}
