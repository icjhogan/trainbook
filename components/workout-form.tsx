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

  const inputClass =
    "w-full px-3 py-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[15px] outline-none focus:ring-2 focus:ring-[var(--color-text)]/10 placeholder:text-[var(--color-muted)]";

  return (
    <div className="space-y-6">
      {/* Image thumbnail */}
      {imagePreview && (
        <button
          onClick={() => setImageExpanded(!imageExpanded)}
          className="w-full overflow-hidden rounded-[var(--radius)]"
        >
          <img
            src={imagePreview}
            alt="Notebook page"
            className={`w-full transition-all duration-300 ${
              imageExpanded ? "max-h-[500px]" : "max-h-28 object-cover"
            }`}
          />
        </button>
      )}

      {/* Flags */}
      {workout.flags?.length > 0 && (
        <div className="px-3 py-2.5 bg-[#3d2e0a] rounded-[var(--radius-sm)] space-y-1">
          {workout.flags.map((flag, i) => (
            <p key={i} className="text-caption text-[#f0c340]">{flag}</p>
          ))}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="text-label mb-1.5 block">date</label>
        <input
          value={workout.date}
          onChange={(e) => updateField("date", e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Type + Events */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-label mb-1.5 block">type</label>
          <input
            value={workout.workout_type}
            onChange={(e) => updateField("workout_type", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-label mb-1.5 block">events</label>
          <input
            value={workout.event_focus.join(", ")}
            onChange={(e) =>
              updateField(
                "event_focus",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            className={inputClass}
          />
        </div>
      </div>

      {/* Exercises */}
      <div>
        <label className="text-label mb-2 block">exercises</label>
        <div className="space-y-2">
          {workout.exercises.map((ex, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface)] rounded-[var(--radius-sm)] p-3 space-y-1.5"
            >
              <input
                value={ex.description}
                onChange={(e) => updateExercise(i, "description", e.target.value)}
                className="w-full text-[15px] bg-transparent outline-none font-medium"
                placeholder="description"
              />
              <div className="flex gap-2">
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
                    className="flex-1 text-caption text-[var(--color-secondary)] bg-transparent outline-none"
                    placeholder="times"
                  />
                )}
                {ex.rest && (
                  <input
                    value={ex.rest}
                    onChange={(e) => updateExercise(i, "rest", e.target.value)}
                    className="w-20 text-caption text-[var(--color-muted)] bg-transparent outline-none text-right"
                    placeholder="rest"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Cues */}
      {workout.technical_cues?.length > 0 && (
        <div>
          <label className="text-label mb-1.5 block">cues</label>
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-sm)] p-3 space-y-1">
            {workout.technical_cues.map((cue, i) => (
              <input
                key={i}
                value={cue}
                onChange={(e) => {
                  const updated = [...workout.technical_cues];
                  updated[i] = e.target.value;
                  updateField("technical_cues", updated);
                }}
                className="w-full text-caption text-[var(--color-secondary)] bg-transparent outline-none"
              />
            ))}
          </div>
        </div>
      )}

      {/* Personal Notes */}
      <div>
        <label className="text-label mb-1.5 block">notes</label>
        <textarea
          value={workout.personal_notes || ""}
          onChange={(e) => updateField("personal_notes", e.target.value || null)}
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="How did it feel?"
        />
      </div>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--color-accent)] text-[var(--color-bg)] text-[15px] font-semibold min-h-[50px] active:scale-[0.98] disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save Entry"}
      </button>
    </div>
  );
}
