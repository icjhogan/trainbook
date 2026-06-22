import { createClient } from "@/lib/supabase/server";
import { embedWorkout } from "@/lib/embeddings";
import type { SupabaseClient } from "@supabase/supabase-js";

// Server-side write funnel for workouts (KTD9). All inserts/updates go through here so the
// row is persisted AND embedded in one place — instead of attaching the server-only OpenAI
// key to client save paths or enumerating every write site (which already missed the manual
// form). Embedding failures are non-fatal: the row still saves; the backfill re-embeds later.

export const maxDuration = 30;

const WORKOUT_FIELDS = [
  "date",
  "date_iso",
  "workout_type",
  "event_focus",
  "exercises",
  "technical_cues",
  "personal_notes",
  "raw_text",
  "flags",
  "image_path",
] as const;

type WorkoutPayload = Record<string, unknown>;

function pickWorkoutFields(body: WorkoutPayload): WorkoutPayload {
  const out: WorkoutPayload = {};
  for (const key of WORKOUT_FIELDS) {
    if (key in body) out[key] = body[key];
  }
  // Normalize an empty date_iso to null so the date column stays clean.
  if (out.date_iso === "") out.date_iso = null;
  return out;
}

function isValidPayload(body: WorkoutPayload): boolean {
  return typeof body.workout_type === "string" && typeof body.date === "string";
}

// Embed the saved row and persist the vector. Best-effort: never throws to the caller.
async function embedAndStore(
  supabase: SupabaseClient,
  row: { id: string } & WorkoutPayload,
): Promise<void> {
  try {
    const embedding = await embedWorkout(row as never);
    await supabase
      .from("workouts")
      .update({ embedding, embedded_at: new Date().toISOString() })
      .eq("id", row.id);
  } catch (err) {
    // Leave embedded_at null so the backfill sweep picks this row up later.
    console.error("[workouts] embedding failed (non-fatal):", err);
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: WorkoutPayload;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }
  if (!isValidPayload(body)) {
    return new Response("Missing required workout fields", { status: 400 });
  }

  const { data, error } = await supabase
    .from("workouts")
    .insert({ ...pickWorkoutFields(body), user_id: user.id })
    .select()
    .single();

  if (error || !data) {
    return new Response(error?.message || "Insert failed", { status: 500 });
  }

  await embedAndStore(supabase, data);
  return Response.json({ workout: data });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: WorkoutPayload;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }
  if (typeof body.id !== "string" || !isValidPayload(body)) {
    return new Response("Missing id or required workout fields", { status: 400 });
  }

  // RLS (auth.uid() = user_id) ensures the user can only update their own row.
  const { data, error } = await supabase
    .from("workouts")
    .update({ ...pickWorkoutFields(body), updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select()
    .single();

  if (error || !data) {
    return new Response(error?.message || "Update failed", { status: 500 });
  }

  await embedAndStore(supabase, data);
  return Response.json({ workout: data });
}
