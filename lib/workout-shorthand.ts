import type { Exercise } from "./types";

// Workout types that may appear as a leading "Type:" prefix in shorthand. Kept narrow so
// that event-ish prefixes used in exercise descriptions (e.g. "HJ:", "LJ:") are NOT
// mistaken for a workout type — those stay part of the description.
const KNOWN_TYPES = new Set([
  "tempo", "extensive tempo", "intensive tempo", "speed", "sprints", "hurdles",
  "high jump", "long jump", "javelin", "shot put", "meet", "practice",
  "recovery", "lift", "weights", "plyos", "plyometrics", "warmup", "cooldown",
]);

export interface ParsedShorthand {
  workoutType?: string;
  exercises: Exercise[];
}

export function emptyExercise(description = ""): Exercise {
  return { description, distance: null, reps: null, sets: null, times: [], rest: null, notes: null };
}

// Parse a digit run to a sane non-negative integer, or null if absurd (so a 21-digit token
// can't become a 1e21 float persisted as reps/sets/distance). Out-of-range -> description-only.
function safeInt(s: string): number | null {
  const n = parseInt(s, 10);
  return Number.isSafeInteger(n) && n >= 0 && n <= 100000 ? n : null;
}

function meters(n: number): string {
  return `${n}m`;
}

// Parse a compact shorthand string (one workout's worth) into structured exercises.
// Forgiving by design: every segment keeps its raw text as `description`, so anything the
// parser can't interpret is preserved rather than dropped (the form's explicit fields are
// the correction surface). Grammar derived from real notation in all_workouts.json.
export function parseWorkoutShorthand(input: string): ParsedShorthand {
  const text = (input || "").trim();
  if (!text) return { exercises: [] };

  let workoutType: string | undefined;
  let body = text;

  // Optional leading "Type:" prefix — only when the prefix is a known workout type.
  const typeMatch = body.match(/^([A-Za-z][A-Za-z ]*?):\s*([\s\S]*)$/);
  if (typeMatch && KNOWN_TYPES.has(typeMatch[1].trim().toLowerCase())) {
    workoutType = typeMatch[1].trim();
    body = typeMatch[2].trim();
  }

  const exercises = body
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseSegment);

  return workoutType ? { workoutType, exercises } : { exercises };
}

function parseSegment(segment: string): Exercise {
  const ex = emptyExercise(segment);
  let work = segment;

  // Parenthetical aside -> notes (raw text stays in description).
  const paren = work.match(/\(([^)]*)\)/);
  if (paren) {
    const idx = paren.index ?? 0;
    ex.notes = paren[1].trim();
    work = (work.slice(0, idx) + work.slice(idx + paren[0].length)).trim();
  }

  // Explicit rest token: r<value> where value begins with a digit (e.g. "r6min", "r5-6min").
  const rest = work.match(/(?:^|\s)r([0-9][^\s]*)/i);
  if (rest) {
    const idx = rest.index ?? 0;
    ex.rest = rest[1];
    work = (work.slice(0, idx) + work.slice(idx + rest[0].length)).trim();
  }

  // Split the distance/reps part from the times part on "@".
  const at = work.indexOf("@");
  const left = (at >= 0 ? work.slice(0, at) : work).trim();
  const right = at >= 0 ? work.slice(at + 1).trim() : "";

  if (right) {
    ex.times = right.split(/\s*[&+,]\s*/).map((t) => t.trim()).filter(Boolean);
  }

  // sets x reps x distance, or reps x distance
  const xForm = left.match(/^(\d+)\s*x\s*(\d+)(?:\s*x\s*(\d+))?/i);
  if (xForm) {
    const a = safeInt(xForm[1]);
    const b = safeInt(xForm[2]);
    const c = xForm[3] ? safeInt(xForm[3]) : undefined;
    if (a !== null && b !== null && (xForm[3] ? c != null : true)) {
      if (xForm[3] && c != null) {
        ex.sets = a;
        ex.reps = b;
        ex.distance = meters(c);
      } else {
        ex.reps = a;
        ex.distance = meters(b);
      }
      return ex;
    }
    // oversized numbers -> fall through to description-only (lossless)
  }

  // combo distance: number (+ number)+ , each optionally suffixed with m
  const combo = left.match(/^\d+\s*m?(?:\s*\+\s*\d+\s*m?)+/i);
  if (combo) {
    const nums = (combo[0].match(/\d+/g) || []).map(safeInt);
    if (nums.length > 0 && nums.every((n) => n !== null)) {
      ex.distance = nums.map((n) => meters(n as number)).join(" + ");
      ex.reps = 1;
      return ex;
    }
  }

  // single distance: a bare number (optionally s/m) that is the entire left part
  const single = left.match(/^(\d+)\s*[sm]?$/i);
  if (single) {
    const n = safeInt(single[1]);
    if (n !== null) {
      ex.distance = meters(n);
      ex.reps = 1;
      return ex;
    }
  }

  // otherwise: description-only (lossless)
  return ex;
}
