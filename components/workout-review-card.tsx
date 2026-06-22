"use client";

import { useState } from "react";
import type { Exercise, ExtractedWorkout } from "@/lib/types";
import { emptyExercise } from "@/lib/workout-shorthand";
import { DateField } from "./date-field";

interface WorkoutReviewCardProps {
  workout: ExtractedWorkout;
  imagePreview?: string;
  onChange: (workout: ExtractedWorkout) => void;
  onSave: () => void;
  saving: boolean;
}

// Always-editable review card for the post-photo confirm screen. Mirrors the expanded
// training-day card's calm layout (left-border exercise blocks, labeled sections) but every
// value is an inline field, with explicit add/remove controls — so nothing extracted is
// un-editable or un-addable (the review step's whole job is fixing wrong/missing fields).
export function WorkoutReviewCard({
  workout,
  imagePreview,
  onChange,
  onSave,
  saving,
}: WorkoutReviewCardProps) {
  const [imageExpanded, setImageExpanded] = useState(false);

  function update<K extends keyof ExtractedWorkout>(key: K, value: ExtractedWorkout[K]) {
    onChange({ ...workout, [key]: value });
  }

  function updateExercise<K extends keyof Exercise>(index: number, field: K, value: Exercise[K]) {
    const next = [...workout.exercises];
    next[index] = { ...next[index], [field]: value };
    update("exercises", next);
  }

  function addExercise() {
    update("exercises", [...workout.exercises, emptyExercise()]);
  }

  function removeExercise(index: number) {
    update("exercises", workout.exercises.filter((_, i) => i !== index));
  }

  function updateCue(index: number, value: string) {
    const next = [...workout.technical_cues];
    next[index] = value;
    update("technical_cues", next);
  }

  const labelCls = "text-label mb-1.5 block";
  // Borderless inline inputs so the card reads cleanly at rest but is clearly editable.
  const lineInput =
    "w-full bg-transparent outline-none focus:bg-[var(--color-surface)] rounded-[6px] px-1 -mx-1 transition-colors";

  return (
    <article className="space-y-6">
      {/* Photo — collapsible, for cross-checking the extraction against the page */}
      {imagePreview && (
        <button
          onClick={() => setImageExpanded(!imageExpanded)}
          className="w-full overflow-hidden rounded-[var(--radius)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Notebook page"
            className={`w-full transition-all duration-300 ${
              imageExpanded ? "max-h-[500px]" : "max-h-28 object-cover"
            }`}
          />
        </button>
      )}

      {/* Flags — read-only data-quality warnings from extraction */}
      {workout.flags?.length > 0 && (
        <div className="px-3 py-2.5 bg-[var(--color-flag-bg)] rounded-[var(--radius-sm)] space-y-1">
          {workout.flags.map((flag, i) => (
            <p key={i} className="text-caption text-[var(--color-flag-text)]">{flag}</p>
          ))}
        </div>
      )}

      {/* Date */}
      <div>
        <label className={labelCls}>date</label>
        <DateField
          value={workout.date_iso}
          onChange={(iso, label) => onChange({ ...workout, date_iso: iso, date: label })}
        />
      </div>

      {/* Type + events */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>type</label>
          <input
            value={workout.workout_type}
            onChange={(e) => update("workout_type", e.target.value)}
            placeholder="Practice"
            className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] glass-input text-[15px] outline-none"
          />
        </div>
        <div>
          <label className={labelCls}>events</label>
          <input
            value={workout.event_focus.join(", ")}
            onChange={(e) =>
              update("event_focus", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
            }
            placeholder="200m, Hurdles"
            className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] glass-input text-[15px] outline-none"
          />
        </div>
      </div>

      {/* Exercises — left-border blocks like the expanded card, every field editable */}
      <div>
        <label className={labelCls}>exercises</label>
        <div className="space-y-3">
          {workout.exercises.map((ex, i) => (
            <div key={i} className="pl-3 border-l-[2px] border-[var(--color-border)] group">
              <div className="flex items-start gap-2">
                <input
                  value={ex.description}
                  onChange={(e) => updateExercise(i, "description", e.target.value)}
                  placeholder="what was done (e.g. 4x300m)"
                  className={`${lineInput} text-body font-medium`}
                />
                <button
                  onClick={() => removeExercise(i)}
                  aria-label="Remove exercise"
                  className="mt-1 w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-surface)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                <label className="text-caption text-[var(--color-muted)] flex items-baseline gap-1">
                  times
                  <input
                    value={ex.times.join(", ")}
                    onChange={(e) =>
                      updateExercise(i, "times", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                    }
                    placeholder="add…"
                    className={`${lineInput} text-caption text-[var(--color-secondary)] w-28`}
                  />
                </label>
                <label className="text-caption text-[var(--color-muted)] flex items-baseline gap-1">
                  rest
                  <input
                    value={ex.rest ?? ""}
                    onChange={(e) => updateExercise(i, "rest", e.target.value || null)}
                    placeholder="add…"
                    className={`${lineInput} text-caption text-[var(--color-secondary)] w-20`}
                  />
                </label>
              </div>
              <input
                value={ex.notes ?? ""}
                onChange={(e) => updateExercise(i, "notes", e.target.value || null)}
                placeholder="note…"
                className={`${lineInput} text-caption italic text-[var(--color-secondary)] mt-1`}
              />
            </div>
          ))}
        </div>
        <button
          onClick={addExercise}
          className="mt-3 text-caption text-[var(--color-secondary)] active:opacity-60"
        >
          + add exercise
        </button>
      </div>

      {/* Cues */}
      <div>
        <label className={labelCls}>cues</label>
        <div className="space-y-1.5">
          {workout.technical_cues.map((cue, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={cue}
                onChange={(e) => updateCue(i, e.target.value)}
                className={`${lineInput} text-caption text-[var(--color-secondary)]`}
              />
              <button
                onClick={() => update("technical_cues", workout.technical_cues.filter((_, idx) => idx !== i))}
                aria-label="Remove cue"
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-surface)]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => update("technical_cues", [...workout.technical_cues, ""])}
          className="mt-2 text-caption text-[var(--color-secondary)] active:opacity-60"
        >
          + add cue
        </button>
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>notes</label>
        <textarea
          value={workout.personal_notes ?? ""}
          onChange={(e) => update("personal_notes", e.target.value || null)}
          rows={2}
          placeholder="how did it feel?"
          className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] glass-input text-[15px] outline-none resize-none"
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3.5 rounded-[var(--radius)] bg-[var(--color-accent)] text-[var(--color-bg)] text-[15px] font-semibold min-h-[50px] active:scale-[0.98] disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save & next"}
      </button>
    </article>
  );
}
