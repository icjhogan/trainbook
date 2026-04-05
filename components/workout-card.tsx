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

  // Edit mode
  if (editing) {
    return (
      <div className="py-4 -mx-5 px-5 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <p className="text-label">editing</p>
          <button
            onClick={() => setEditing(false)}
            className="w-[32px] h-[32px] flex items-center justify-center rounded-full active:bg-[var(--color-surface)] transition-colors"
            aria-label="Cancel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
    <article className="py-4 -mx-5 px-5 transition-colors rounded-lg">
      {/* Header row with expand/collapse chevron */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-start justify-between cursor-pointer active:opacity-70 transition-opacity"
      >
        <div className="flex-1">
          <h3 className="text-subheading">{workout.date}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <WorkoutPill label={workout.workout_type} kind="type" />
            {workout.event_focus?.map((e) => (
              <WorkoutPill key={e} label={e} kind="event" />
            ))}
          </div>
        </div>

        {/* Chevron */}
        <div className="mt-1 ml-2 flex-shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
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
        <div className="mt-4 animate-fade-in">
          {/* Action icons — top right of expanded content */}
          <div className="flex items-center justify-end gap-1 mb-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="w-[36px] h-[36px] flex items-center justify-center rounded-full glass-button active:scale-90 transition-all"
              aria-label="Edit"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>

            {!confirmDelete ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-[36px] h-[36px] flex items-center justify-center rounded-full glass-button active:scale-90 transition-all"
                aria-label="Delete"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onDelete(workout.id)}
                  className="h-[36px] px-3 flex items-center justify-center rounded-full text-[12px] font-medium text-[var(--color-danger)] glass-button active:scale-95 transition-all"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="w-[36px] h-[36px] flex items-center justify-center rounded-full glass-button active:scale-90 transition-all"
                  aria-label="Cancel"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

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
            <div className="mt-5">
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
            <div className="mt-5">
              <p className="text-label mb-1.5">notes</p>
              <p className="text-body italic text-[var(--color-secondary)]">
                {workout.personal_notes}
              </p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
