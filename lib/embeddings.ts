import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import type { Workout, ExtractedWorkout } from "./types";

// OpenAI text-embedding-3-small, truncated to 1024 dims (Matryoshka) to match the
// `embedding vector(1024)` column exactly. Server-only — OPENAI_API_KEY must never reach
// the client. See KTD2 in the plan.
const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1024;

type EmbeddingSource = Pick<
  Workout | ExtractedWorkout,
  "date" | "workout_type" | "event_focus" | "exercises" | "technical_cues" | "personal_notes"
>;

// The human-readable text a workout is embedded from. Pure + deterministic so it's unit
// testable and so re-embedding an unchanged workout produces stable input. Concatenates the
// fields a semantic query would plausibly match (type, events, what was done, cues, notes).
export function workoutEmbeddingText(w: EmbeddingSource): string {
  const lines: string[] = [];
  lines.push(`${w.date} — ${w.workout_type}`);
  if (w.event_focus?.length) lines.push(`Events: ${w.event_focus.join(", ")}`);
  for (const ex of w.exercises || []) {
    let line = ex.description || "";
    if (ex.times?.length) line += ` (${ex.times.join(", ")})`;
    if (ex.rest) line += ` rest ${ex.rest}`;
    if (ex.notes) line += ` — ${ex.notes}`;
    if (line.trim()) lines.push(line.trim());
  }
  if (w.technical_cues?.length) lines.push(`Cues: ${w.technical_cues.join("; ")}`);
  if (w.personal_notes) lines.push(`Notes: ${w.personal_notes}`);
  return lines.join("\n");
}

// Embed an arbitrary string (used for both workout text and incoming search queries).
// Returns a 1024-length vector. Throws on API failure — callers decide whether that's fatal
// (search) or swallowed (write-time embedding).
export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: openai.textEmbeddingModel(EMBEDDING_MODEL),
    value: text.slice(0, 8000), // generous cap; a workout is ~150 tokens
    providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
  });
  return embedding;
}

export function embedWorkout(w: EmbeddingSource): Promise<number[]> {
  return embedText(workoutEmbeddingText(w));
}
