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

// Workout data produced by extraction or the manual entry form, before it is persisted
// (no db-assigned id/user_id/timestamps/image_path/embedding). Shared by the upload page
// and the workout form so the editable shape has a single definition.
export interface ExtractedWorkout {
  date: string;
  date_iso: string;
  workout_type: string;
  event_focus: string[];
  exercises: Exercise[];
  technical_cues: string[];
  personal_notes: string | null;
  raw_text: string;
  flags: string[];
}
