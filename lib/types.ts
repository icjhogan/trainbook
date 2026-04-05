export interface Exercise {
  description: string;
  distance: string | null;
  reps: number | null;
  sets: number | null;
  times: string[];
  rest: string | null;
  notes: string | null;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  date_iso: string;
  workout_type: string;
  event_focus: string[];
  exercises: Exercise[];
  technical_cues: string[];
  personal_notes: string | null;
  raw_text: string;
  flags: string[];
  image_path: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export type WorkoutInsert = Omit<Workout, "id" | "created_at" | "updated_at">;
