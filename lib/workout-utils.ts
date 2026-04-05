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
