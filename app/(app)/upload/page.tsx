"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadWorkoutImage } from "@/lib/supabase/storage";
import { WorkoutForm } from "@/components/workout-form";
import { Toast } from "@/components/toast";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

type UploadState = "capture" | "uploading" | "extracting" | "confirm";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("capture");
  const [imagePreview, setImagePreview] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [workouts, setWorkouts] = useState<ExtractedWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

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
        setTimeout(() => router.push("/feed"), 1500);
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

  if (state === "uploading" || state === "extracting") {
    return (
      <div className="px-5 pt-14 flex flex-col items-center justify-center min-h-[60dvh]">
        <p className="text-sm text-[var(--color-muted)] animate-pulse">
          {state === "uploading" ? "uploading..." : "reading your notes..."}
        </p>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Preview"
            className="mt-6 w-48 rounded-lg opacity-60"
          />
        )}
      </div>
    );
  }

  if (state === "confirm") {
    return (
      <div className="px-5 pt-14 pb-8">
        <h1 className="text-xl font-semibold tracking-tight mb-6">
          {workouts.length === 1
            ? "confirm entry"
            : `confirm ${workouts.length} entries`}
        </h1>

        {workouts.map((w, i) => (
          <div key={i} className={i > 0 ? "mt-10 pt-10 border-t border-[var(--color-border)]" : ""}>
            <WorkoutForm
              workout={w}
              imagePreview={imagePreview}
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

  return (
    <div className="px-5 pt-14">
      <h1 className="text-xl font-semibold tracking-tight mb-8">add entry</h1>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

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

      <div className="space-y-3">
        <button
          onClick={() => cameraRef.current?.click()}
          className="w-full py-4 text-base text-center border border-[var(--color-border)] rounded-lg min-h-[44px] active:bg-[var(--color-border)] transition-colors"
        >
          take a photo
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-4 text-base text-center text-[var(--color-muted)] min-h-[44px] active:opacity-50 transition-opacity"
        >
          choose from library
        </button>
      </div>

      <Toast message={toast} visible={!!toast} onDone={() => setToast("")} />
    </div>
  );
}
