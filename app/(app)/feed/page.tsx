import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .order("date_iso", { ascending: false })
    .limit(20);

  // Surface a real fetch failure to the error boundary instead of rendering an
  // empty feed that looks like "no workouts yet".
  if (error) throw error;

  return <FeedClient initialWorkouts={workouts || []} />;
}
