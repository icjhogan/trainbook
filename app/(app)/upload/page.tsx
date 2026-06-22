"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadWorkoutImage } from "@/lib/supabase/storage";
import { WorkoutForm } from "@/components/workout-form";
import { WorkoutReviewCard } from "@/components/workout-review-card";
import { Toast } from "@/components/toast";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedWorkout } from "@/lib/types";
import { formatDateLabel, isValidDateIso, resolveEntryDateIso } from "@/lib/workout-utils";
import { emptyExercise } from "@/lib/workout-shorthand";

const LOADING_MESSAGES = [
  "Reading your handwriting...",
  "Deciphering those splits...",
  "Figuring out the rest intervals...",
  "Parsing your coaching cues...",
  "Almost got it...",
  "Recognizing the workout structure...",
  "Extracting the details...",
  "Making sense of the margins...",
  "Spotting the technical notes...",
  "Translating notebook to data...",
];

type UploadState = "capture" | "uploading" | "extracting" | "confirm";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("capture");
  const [imagePreview, setImagePreview] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [workouts, setWorkouts] = useState<ExtractedWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  // Backfill aids: a session year anchor (ephemeral) and the carry-forward from the last
  // manual save, so the rapid-repeat loop defaults each new entry sensibly.
  const [anchorYear, setAnchorYear] = useState("");
  const [entryMode, setEntryMode] = useState<"photo" | "manual">("photo");
  const [entryKey, setEntryKey] = useState(0); // bumped per fresh manual entry to remount the form
  const carryRef = useRef<{ date_iso: string; workout_type: string; event_focus: string[] }>({
    date_iso: "",
    workout_type: "Practice",
    event_focus: [],
  });
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // A fresh blank manual entry: date sticky to the last save (else the anchor year, else
  // today); workout type and events carried forward from the last manual save.
  function blankManualWorkout(): ExtractedWorkout {
    const c = carryRef.current;
    const dateIso = resolveEntryDateIso(c.date_iso, anchorYear, new Date().toISOString().slice(0, 10));
    return {
      date: formatDateLabel(dateIso),
      date_iso: dateIso,
      workout_type: c.workout_type || "Practice",
      event_focus: c.event_focus || [],
      exercises: [emptyExercise()],
      technical_cues: [],
      personal_notes: null,
      raw_text: "",
      flags: [],
    };
  }

  useEffect(() => {
    if (state !== "extracting") return;
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 2800);
    return () => clearInterval(interval);
  }, [state]);

  async function handleFile(file: File) {
    setEntryMode("photo");
    setImagePreview(URL.createObjectURL(file));
    setState("uploading");
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const path = await uploadWorkoutImage(supabase, user.id, file);
      setImagePath(path);
      setState("extracting");

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: path, anchorYear: anchorYear || undefined }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Extraction failed");
      }

      const { workouts: extracted } = await res.json();
      setWorkouts(extracted);
      setState("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("capture");
    }
  }

  async function handleSave(index: number) {
    if (saving) return; // guard against double-submit in the rapid-repeat loop
    const workout = workouts[index];
    // Block saving an unsortable date — it would persist but vanish from the feed.
    if (!isValidDateIso(workout.date_iso)) {
      setToast("Pick a valid date before saving");
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("workouts").insert({
        user_id: user.id,
        date: workout.date,
        date_iso: workout.date_iso || null,
        workout_type: workout.workout_type,
        event_focus: workout.event_focus,
        exercises: workout.exercises,
        technical_cues: workout.technical_cues,
        personal_notes: workout.personal_notes,
        raw_text: workout.raw_text,
        flags: workout.flags,
        image_path: imagePath,
      });

      if (error) throw error;

      // Carry the confirmed date/type/events forward for the next entry (either mode).
      carryRef.current = {
        date_iso: workout.date_iso,
        workout_type: workout.workout_type,
        event_focus: workout.event_focus,
      };

      if (entryMode === "manual") {
        // Rapid-repeat: present a fresh entry in place.
        setEntryKey((k) => k + 1);
        setWorkouts([blankManualWorkout()]);
        setToast("saved — next entry");
      } else {
        const remaining = workouts.filter((_, i) => i !== index);
        setWorkouts(remaining);
        setToast("workout saved");
        if (remaining.length === 0) {
          // Snap-confirm loop: return to capture for the next photo, not the feed.
          setImagePreview("");
          setImagePath("");
          setState("capture");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save workout");
    } finally {
      setSaving(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  // Loading state
  if (state === "uploading" || state === "extracting") {
    return (
      <div className="px-5 pt-14 flex flex-col items-center justify-center min-h-[70dvh] animate-fade-in">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            className="w-40 rounded-[var(--radius)] shadow-sm opacity-80"
          />
        )}
        <p
          key={state === "uploading" ? "uploading" : loadingMsg}
          className="text-body text-[var(--color-secondary)] mt-6 animate-fade-in"
        >
          {state === "uploading" ? "Uploading..." : loadingMsg}
        </p>
      </div>
    );
  }

  // Confirm state
  if (state === "confirm") {
    return (
      <div className="px-5 pt-14 pb-8 animate-fade-in-up">
        <h1 className="text-title mb-8">
          {workouts.length === 1
            ? "Confirm entry"
            : `Confirm ${workouts.length} entries`}
        </h1>

        {workouts.map((w, i) => (
          <div
            key={entryMode === "manual" ? `manual-${entryKey}` : i}
            className={i > 0 ? "mt-10 pt-10 border-t border-[var(--color-separator)]" : ""}
          >
            {/* Entry header with count and dismiss */}
            {workouts.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-caption text-[var(--color-muted)]">
                  Entry {i + 1} of {workouts.length}
                </p>
                <button
                  onClick={() => {
                    const remaining = workouts.filter((_, idx) => idx !== i);
                    setWorkouts(remaining);
                    setToast("entry dropped");
                    if (remaining.length === 0) {
                      setTimeout(() => router.push("/feed"), 800);
                    }
                  }}
                  className="flex items-center gap-1.5 min-h-[36px] px-2 rounded-full active:bg-[var(--color-surface)] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="text-[12px] text-[var(--color-muted)]">Skip</span>
                </button>
              </div>
            )}

            {(() => {
              const props = {
                workout: w,
                imagePreview: i === 0 ? imagePreview : undefined,
                onChange: (updated: ExtractedWorkout) => {
                  const next = [...workouts];
                  next[i] = updated;
                  setWorkouts(next);
                },
                onSave: () => handleSave(i),
                saving,
              };
              // Photo review uses the always-editable card; manual entry keeps the
              // shorthand-driven form.
              return entryMode === "photo" ? (
                <WorkoutReviewCard {...props} />
              ) : (
                <WorkoutForm {...props} />
              );
            })()}
          </div>
        ))}

        <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
      </div>
    );
  }

  // Capture state
  return (
    <div className="flex flex-col min-h-[calc(100dvh-80px)] animate-fade-in-up">
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Main capture area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {error && (
          <div className="mb-8 px-4 py-3 bg-[var(--color-danger-bg)] rounded-[var(--radius-sm)] animate-fade-in w-full">
            <p className="text-caption text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        {/* Backfill year anchor (optional) — defaults the year for new entries + extraction */}
        <div className="w-full max-w-[320px] mb-6">
          <label className="text-label mb-1.5 block">backfill year (optional)</label>
          <input
            type="number"
            inputMode="numeric"
            value={anchorYear}
            onChange={(e) => setAnchorYear(e.target.value)}
            placeholder="e.g. 2025"
            className="w-full px-3 py-2.5 rounded-[var(--radius-sm)] glass-input text-[15px] outline-none"
          />
          <p className="text-caption text-[var(--color-muted)] mt-1">
            Sets the default year for new entries and photo extraction.
          </p>
        </div>

        {/* Camera target area */}
        <button
          onClick={() => cameraRef.current?.click()}
          className="w-full aspect-[4/3] max-w-[320px] rounded-[20px] glass flex flex-col items-center justify-center gap-4 active:scale-[0.97] transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7.5 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5L14.5 4z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-subheading text-[var(--color-text)]">
              Snap your notebook
            </p>
            <p className="text-caption text-[var(--color-muted)] mt-1">
              Take a photo of your workout page
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-[320px] my-6">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-caption text-[var(--color-muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* Secondary options */}
        <div className="w-full max-w-[320px] space-y-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full py-3 text-[14px] text-center text-[var(--color-secondary)] glass-button rounded-[var(--radius)] min-h-[44px] active:scale-[0.98] transition-all"
          >
            Choose from library
          </button>
          <button
            onClick={() => {
              setEntryMode("manual");
              carryRef.current = { date_iso: "", workout_type: "Practice", event_focus: [] };
              setEntryKey((k) => k + 1);
              setWorkouts([blankManualWorkout()]);
              setState("confirm");
            }}
            className="w-full py-3 text-[14px] text-center text-[var(--color-muted)] min-h-[44px] active:opacity-50 transition-opacity"
          >
            Write it manually
          </button>
        </div>
      </div>

      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
    </div>
  );
}
