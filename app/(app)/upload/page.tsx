"use client";

import { createClient } from "@/lib/supabase/client";
import { uploadWorkoutImage } from "@/lib/supabase/storage";
import { useState, useRef } from "react";

type UploadState = "capture" | "uploading" | "extracting" | "confirm";

export default function UploadPage() {
  const [state, setState] = useState<UploadState>("capture");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imagePath, setImagePath] = useState<string>("");
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [error, setError] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

      const { workouts } = await res.json();
      setExtractedData(workouts);
      setState("confirm");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setState("capture");
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
      <div className="px-5 pt-14">
        <h1 className="text-xl font-semibold tracking-tight mb-4">confirm</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {extractedData.length} workout(s) extracted. Form coming in Task 6.
        </p>
        <pre className="text-xs mt-4 overflow-auto max-h-[60dvh] text-[var(--color-muted)]">
          {JSON.stringify(extractedData, null, 2)}
        </pre>
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
    </div>
  );
}
