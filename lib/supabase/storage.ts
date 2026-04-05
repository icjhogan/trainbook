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

export function getImageUrl(
  supabase: SupabaseClient,
  path: string
): string {
  const { data } = supabase.storage
    .from("workout-images")
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("workout-images")
    .createSignedUrl(path, 3600);

  if (error) throw error;
  return data.signedUrl;
}
