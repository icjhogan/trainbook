"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadWorkoutImage } from "@/lib/supabase/storage";
import { WorkoutForm } from "@/components/workout-form";
import { Toast } from "@/components/toast";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Exercise } from "@/lib/types";

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
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

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
        body: JSON.stringify({ imagePath: path }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Extraction failed");
      }

      const { workouts: extracted } = await res.json();
      setWorkouts(extracted);
      setState("confirm");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setState("capture");
    }
  }

  async function handleSave(index: number) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const workout = workouts[index];
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

      const remaining = workouts.filter((_, i) => i !== index);
      setWorkouts(remaining);
      setToast("workout saved");

      if (remaining.length === 0) {
        setTimeout(() => router.push("/feed"), 1200);
      }
    } catch (err: any) {
      setError(err.message);
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
      <div className="px-5 pt-4 flex flex-col items-center justify-center min-h-[70dvh] animate-fade-in">
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
      <div className="px-5 pt-4 pb-8 animate-fade-in-up">
        <h1 className="text-title mb-8">
          {workouts.length === 1
            ? "Confirm entry"
            : `Confirm ${workouts.length} entries`}
        </h1>

        {workouts.map((w, i) => (
          <div
            key={i}
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

            <WorkoutForm
              workout={w}
              imagePreview={i === 0 ? imagePreview : undefined}
              onChange={(updated) => {
                const next = [...workouts];
                next[i] = updated;
                setWorkouts(next);
              }}
              onSave={() => handleSave(i)}
              saving={saving}
            />
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
          <div className="mb-8 px-4 py-3 bg-[#3b1414] rounded-[var(--radius-sm)] animate-fade-in w-full">
            <p className="text-caption text-[var(--color-danger)]">{error}</p>
          </div>
        )}

        {/* Camera target area */}
        <button
          onClick={() => cameraRef.current?.click()}
          className="w-full aspect-[4/3] max-w-[320px] rounded-[20px] glass flex flex-col items-center justify-center gap-4 active:scale-[0.97] transition-all"
        >
          <div className="w-14 h-14 rounded-full bg-[var(--color-text)] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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

        {/* File picker */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full max-w-[320px] py-3.5 text-[15px] text-center text-[var(--color-secondary)] glass-button rounded-[var(--radius)] min-h-[48px] active:scale-[0.98] transition-all"
        >
          Choose from library
        </button>
      </div>

      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
    </div>
  );
}
