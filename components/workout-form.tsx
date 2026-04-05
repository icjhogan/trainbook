"use client";

import { useState } from "react";
import type { Exercise } from "@/lib/types";

interface ExtractedWorkout {
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

interface WorkoutFormProps {
  workout: ExtractedWorkout;
  imagePreview?: string;
  onChange: (workout: ExtractedWorkout) => void;
  onSave: () => void;
  saving: boolean;
}

export function WorkoutForm({
  workout,
  imagePreview,
  onChange,
  onSave,
  saving,
}: WorkoutFormProps) {
  const [imageExpanded, setImageExpanded] = useState(false);

  function updateField<K extends keyof ExtractedWorkout>(
    key: K,
    value: ExtractedWorkout[K]
  ) {
    onChange({ ...workout, [key]: value });
  }

  function updateExercise(index: number, field: keyof Exercise, value: any) {
    const updated = [...workout.exercises];
    updated[index] = { ...updated[index], [field]: value };
    updateField("exercises", updated);
  }

  return (
    <div className="space-y-5">
      {/* Image thumbnail */}
      {imagePreview && (
        <button
          onClick={() => setImageExpanded(!imageExpanded)}
          className="w-full"
        >
          <img
            src={imagePreview}
            alt="Notebook page"
            className={`w-full rounded-lg transition-all ${
              imageExpanded ? "max-h-none" : "max-h-32 object-cover"
            }`}
          />
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {imageExpanded ? "tap to collapse" : "tap to expand"}
          </p>
        </button>
      )}

      {/* Flags */}
      {workout.flags.length > 0 && (
        <div className="space-y-1">
          {workout.flags.map((flag, i) => (
            <p key={i} className="text-xs text-amber-600">
              {flag}
            </p>
          ))}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
          date
        </label>
        <input
          value={workout.date}
          onChange={(e) => updateField("date", e.target.value)}
          className="w-full mt-1 text-base bg-transparent border-b border-[var(--color-border)] py-2 outline-none focus:border-[var(--color-text)] transition-colors"
        />
      </div>

      {/* Type + Events */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            type
          </label>
          <input
            value={workout.workout_type}
            onChange={(e) => updateField("workout_type", e.target.value)}
            className="w-full mt-1 text-sm bg-transparent border-b border-[var(--color-border)] py-2 outline-none focus:border-[var(--color-text)] transition-colors"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            events
          </label>
          <input
            value={workout.event_focus.join(", ")}
            onChange={(e) =>
              updateField(
                "event_focus",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            className="w-full mt-1 text-sm bg-transparent border-b border-[var(--color-border)] py-2 outline-none focus:border-[var(--color-text)] transition-colors"
          />
        </div>
      </div>

      {/* Exercises */}
      <div>
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
          exercises
        </label>
        <div className="mt-2 space-y-3">
          {workout.exercises.map((ex, i) => (
            <div key={i} className="border-l-2 border-[var(--color-border)] pl-3 space-y-1">
              <input
                value={ex.description}
                onChange={(e) => updateExercise(i, "description", e.target.value)}
                className="w-full text-sm bg-transparent outline-none"
                placeholder="description"
              />
              <div className="flex gap-3 text-xs text-[var(--color-muted)]">
                {ex.times?.length > 0 && (
                  <input
                    value={ex.times.join(", ")}
                    onChange={(e) =>
                      updateExercise(
                        i,
                        "times",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="flex-1 bg-transparent outline-none"
                    placeholder="times"
                  />
                )}
                {ex.rest && (
                  <input
                    value={ex.rest}
                    onChange={(e) => updateExercise(i, "rest", e.target.value)}
                    className="w-20 bg-transparent outline-none"
                    placeholder="rest"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Cues */}
      {workout.technical_cues.length > 0 && (
        <div>
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            cues
          </label>
          <div className="mt-1 space-y-1">
            {workout.technical_cues.map((cue, i) => (
              <input
                key={i}
                value={cue}
                onChange={(e) => {
                  const updated = [...workout.technical_cues];
                  updated[i] = e.target.value;
                  updateField("technical_cues", updated);
                }}
                className="w-full text-sm text-[var(--color-muted)] bg-transparent outline-none"
              />
            ))}
          </div>
        </div>
      )}

      {/* Personal Notes */}
      <div>
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
          notes
        </label>
        <textarea
          value={workout.personal_notes || ""}
          onChange={(e) => updateField("personal_notes", e.target.value || null)}
          rows={2}
          className="w-full mt-1 text-sm bg-transparent border-b border-[var(--color-border)] py-2 outline-none focus:border-[var(--color-text)] transition-colors resize-none"
          placeholder="how did it feel?"
        />
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-lg bg-[var(--color-text)] text-[var(--color-surface)] text-base font-medium disabled:opacity-50 transition-opacity min-h-[44px]"
      >
        {saving ? "saving..." : "save"}
      </button>
    </div>
  );
}
