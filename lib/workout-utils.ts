import type { Exercise, Workout } from "./types";

export function buildSummary(workout: Partial<Workout>): string {
  const parts: string[] = [];

  parts.push(`${workout.date}: ${workout.workout_type}`);
  if (workout.event_focus?.length) {
    parts[0] += ` focusing on ${workout.event_focus.join(", ")}`;
  }
  parts[0] += ".";

  for (const ex of workout.exercises || []) {
    let s = ex.description;
    if (ex.times?.length) {
      s += ` (times: ${ex.times.join(", ")})`;
    }
    parts.push(s);
  }

  if (workout.technical_cues?.length) {
    parts.push("Technical cues: " + workout.technical_cues.join("; "));
  }

  if (workout.personal_notes) {
    parts.push("Notes: " + workout.personal_notes);
  }

  return parts.join(" ");
}

// True only for a well-formed YYYY-MM-DD string that names a real calendar date.
// Guards every consumer of the date math below from RangeErrors on malformed input.
export function isValidDateIso(value: string | null | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(value + "T00:00:00").getTime());
}

// Monday-anchored ISO week key (e.g. "2025-11-10"). Single source of truth —
// previously duplicated in dashboard-client, feed-client, and the chat route.
// Returns null on invalid input rather than throwing (a bad date_iso used to crash
// toISOString() with a RangeError). NOTE: uses toISOString(), so the key is computed
// in UTC; correct for UTC/positive offsets but can shift a day in negative-UTC
// locales. Left as-is to preserve current bucketing behavior; a local-time rewrite
// is a separate follow-up.
export function getWeekKey(dateIso: string): string | null {
  if (!isValidDateIso(dateIso)) return null;
  const d = new Date(dateIso + "T00:00:00");
  const monday = new Date(d);
  monday.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return monday.toISOString().slice(0, 10);
}

export function parseDistanceMeters(distStr: string | null): number {
  if (!distStr) return 0;
  const cleaned = distStr.replace(/\[.*?\]/g, "").trim();
  const matches = cleaned.match(/(\d+)\s*m/gi);
  if (!matches) return 0;
  return matches.reduce((sum, m) => {
    const num = parseInt(m);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
}

// Case-insensitive substring search across the human-readable workout fields.
// Empty query returns the list unchanged.
export function searchWorkouts(workouts: Workout[], query: string): Workout[] {
  const q = query.toLowerCase().trim();
  if (!q) return workouts;

  return workouts.filter((w) => {
    const fields = [
      w.date,
      w.workout_type,
      ...(w.event_focus || []),
      w.personal_notes || "",
      w.raw_text || "",
      ...(w.technical_cues || []),
      ...(w.exercises || []).map((e) => e.description),
    ];
    return fields.some((f) => f.toLowerCase().includes(q));
  });
}

export function calculateRunningVolume(exercises: Exercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    if (ex.distance?.includes("+")) continue;
    const dist = parseDistanceMeters(ex.distance);
    if (dist > 0) {
      const reps = ex.reps || 1;
      const sets = ex.sets || 1;
      total += dist * reps * sets;
    }
  }
  return total;
}
