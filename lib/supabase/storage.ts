import { SupabaseClient } from "@supabase/supabase-js";

export async function uploadWorkoutImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("workout-images")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return fileName;
}

// NOTE: getImageUrl/getSignedUrl were removed as dead code. The workout-images bucket is
// private, so getPublicUrl never worked; the extract route mints signed URLs inline. Add a
// helper back here if a component ever needs to display stored images.
