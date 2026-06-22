import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .order("date_iso", { ascending: false })
    // Show the full history. The 20-cap silently hid older entries once the log grew past
    // 20, making manually-entered months look deleted. Paginate if this ever exceeds ~1000.
    .limit(1000);

  // Surface a real fetch failure to the error boundary instead of rendering an
  // empty feed that looks like "no workouts yet".
  if (error) throw error;

  return <FeedClient initialWorkouts={workouts || []} />;
}
