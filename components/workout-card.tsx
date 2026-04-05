"use client";

import { useState } from "react";
import type { Workout, Exercise } from "@/lib/types";
import { WorkoutPill } from "./workout-pill";
import { WorkoutForm } from "./workout-form";
import { createClient } from "@/lib/supabase/client";

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
  onUpdate: (updated: Workout) => void;
}

export function WorkoutCard({ workout, onDelete, onUpdate }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    date: workout.date,
    date_iso: workout.date_iso,
    workout_type: workout.workout_type,
    event_focus: workout.event_focus || [],
    exercises: workout.exercises || [],
    technical_cues: workout.technical_cues || [],
    personal_notes: workout.personal_notes,
    raw_text: workout.raw_text || "",
    flags: workout.flags || [],
  });

  const supabase = createClient();

  const exercisePreview = workout.exercises?.slice(0, 2) || [];
  const hasMore = (workout.exercises?.length || 0) > 2;

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("workouts")
      .update({
        date: editData.date,
        date_iso: editData.date_iso || null,
        workout_type: editData.workout_type,
        event_focus: editData.event_focus,
        exercises: editData.exercises,
        technical_cues: editData.technical_cues,
        personal_notes: editData.personal_notes,
        raw_text: editData.raw_text,
        flags: editData.flags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workout.id);

    setSaving(false);

    if (!error) {
      onUpdate({ ...workout, ...editData });
      setEditing(false);
    }
  }

  // Edit mode — show the workout form
  if (editing) {
    return (
      <div className="py-4 -mx-5 px-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <p className="text-label">editing</p>
          <button
            onClick={() => setEditing(false)}
            className="text-caption text-[var(--color-secondary)] min-h-[44px] flex items-center active:opacity-50"
          >
            Cancel
          </button>
        </div>
        <WorkoutForm
          workout={editData}
          onChange={setEditData}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <article
      onClick={() => setExpanded(!expanded)}
      className="py-4 active:bg-[var(--color-surface)] -mx-5 px-5 transition-colors rounded-lg cursor-pointer"
    >
      {/* Header */}
      <h3 className="text-subheading">
        {workout.date}
      </h3>

      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
        <WorkoutPill label={workout.workout_type} kind="type" />
        {workout.event_focus?.map((e) => (
          <WorkoutPill key={e} label={e} kind="event" />
        ))}
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div className="mt-2.5">
          <div className="space-y-1">
            {exercisePreview.map((ex, i) => (
              <p key={i} className="text-body text-[var(--color-text)]">
                {ex.description}
                {ex.times?.length > 0 && (
                  <span className="text-[var(--color-secondary)]">
                    {" "}&mdash; {ex.times.join(", ")}
                  </span>
                )}
              </p>
            ))}
          </div>
          {hasMore && (
            <p className="text-caption text-[var(--color-muted)] mt-1">
              +{(workout.exercises?.length || 0) - 2} more
            </p>
          )}

          {workout.personal_notes && (
            <p className="text-caption italic text-[var(--color-secondary)] mt-2 line-clamp-2">
              {workout.personal_notes}
            </p>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-4 space-y-5 animate-fade-in">
          {/* Exercises */}
          <div className="space-y-3">
            {workout.exercises?.map((ex, i) => (
              <div
                key={i}
                className="pl-3 border-l-[2px] border-[var(--color-border)]"
              >
                <p className="text-body">{ex.description}</p>
                {(ex.times?.length > 0 || ex.rest) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    {ex.times?.length > 0 && (
                      <span className="text-caption text-[var(--color-secondary)]">
                        {ex.times.join(", ")}
                      </span>
                    )}
                    {ex.rest && (
                      <span className="text-caption text-[var(--color-muted)]">
                        rest: {ex.rest}
                      </span>
                    )}
                  </div>
                )}
                {ex.notes && (
                  <p className="text-caption italic text-[var(--color-secondary)] mt-1">
                    {ex.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Cues */}
          {workout.technical_cues?.length > 0 && (
            <div>
              <p className="text-label mb-1.5">cues</p>
              <div className="space-y-0.5">
                {workout.technical_cues.map((cue, i) => (
                  <p key={i} className="text-caption text-[var(--color-secondary)]">
                    {cue}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {workout.personal_notes && (
            <div>
              <p className="text-label mb-1.5">notes</p>
              <p className="text-body italic text-[var(--color-secondary)]">
                {workout.personal_notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="text-caption text-[var(--color-secondary)] font-medium min-h-[44px] flex items-center active:opacity-50"
            >
              edit
            </button>

            {!confirmDelete ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="text-caption text-[var(--color-muted)] min-h-[44px] flex items-center"
              >
                delete
              </button>
            ) : (
              <div
                className="flex items-center gap-4 animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onDelete(workout.id)}
                  className="text-caption text-[var(--color-danger)] font-medium min-h-[44px] flex items-center"
                >
                  confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-caption text-[var(--color-muted)] min-h-[44px] flex items-center"
                >
                  cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
