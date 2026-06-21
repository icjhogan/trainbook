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

// Monday-anchored ISO week key (e.g. "2025-11-10"). Single source of truth —
// previously duplicated in dashboard-client, feed-client, and the chat route.
// NOTE: uses toISOString(), so the key is computed in UTC; correct for UTC/positive
// offsets but can shift a day in negative-UTC locales. Left as-is to preserve current
// bucketing behavior; a local-time rewrite is a separate follow-up.
export function getWeekKey(dateIso: string): string {
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
