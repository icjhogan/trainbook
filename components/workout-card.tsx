"use client";

import { useState, useRef, useEffect } from "react";
import type { Workout, Exercise } from "@/lib/types";
import { WorkoutPill } from "./workout-pill";
import { WorkoutForm } from "./workout-form";
import { createClient } from "@/lib/supabase/client";
import { useChatContext } from "@/lib/chat-context";

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
  onUpdate: (updated: Workout) => void;
  onOpenChat: () => void;
}

export function WorkoutCard({ workout, onDelete, onUpdate, onOpenChat }: WorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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
  const { attachWorkout } = useChatContext();

  const exercisePreview = workout.exercises?.slice(0, 2) || [];
  const hasMore = (workout.exercises?.length || 0) > 2;

  // Close menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    function handleTap(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", handleTap);
    return () => document.removeEventListener("mousedown", handleTap);
  }, [menuOpen]);

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
    <article className="py-3.5 px-4 rounded-[var(--radius)] bg-[var(--color-surface)]/50">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex-1 cursor-pointer active:opacity-70 transition-opacity"
        >
          <h3 className="text-[16px] font-semibold tracking-tight">{workout.date}</h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <WorkoutPill label={workout.workout_type} kind="type" />
            {workout.event_focus?.map((e) => (
              <WorkoutPill key={e} label={e} kind="event" />
            ))}
          </div>
        </div>

        {/* Three-dot menu */}
        <div className="relative ml-2 mt-0.5" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
              setConfirmDelete(false);
            }}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-full active:bg-[var(--color-surface)] transition-colors"
            aria-label="Options"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="5" cy="12" r="1.5" fill="var(--color-muted)" />
              <circle cx="12" cy="12" r="1.5" fill="var(--color-muted)" />
              <circle cx="19" cy="12" r="1.5" fill="var(--color-muted)" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[32px] w-[150px] glass-dropdown rounded-[var(--radius-sm)] py-1 animate-fade-in z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  attachWorkout(workout);
                  onOpenChat();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] active:bg-white/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Ask AI
              </button>
              <div className="h-px bg-white/5 mx-2" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] active:bg-white/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
                Edit
              </button>
              <div className="h-px bg-white/5 mx-2" />
              {!confirmDelete ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--color-danger)] active:bg-white/5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(workout.id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[var(--color-danger)] font-medium active:bg-white/5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Confirm delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Collapsed preview */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          className="mt-2 cursor-pointer active:opacity-70 transition-opacity"
        >
          <div className="space-y-0.5">
            {exercisePreview.map((ex, i) => (
              <p key={i} className="text-[14px] text-[var(--color-secondary)]">
                {ex.description}
                {ex.times?.length > 0 && (
                  <span className="text-[var(--color-muted)]">
                    {" "}&mdash; {ex.times.join(", ")}
                  </span>
                )}
              </p>
            ))}
          </div>
          {hasMore && (
            <p className="text-[12px] text-[var(--color-muted)] mt-1">
              +{(workout.exercises?.length || 0) - 2} more
            </p>
          )}

          {workout.personal_notes && (
            <p className="text-[13px] italic text-[var(--color-muted)] mt-1.5 line-clamp-2">
              {workout.personal_notes}
            </p>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          className="mt-4 cursor-pointer active:opacity-80 transition-opacity animate-fade-in"
        >
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
