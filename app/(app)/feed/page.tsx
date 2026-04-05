import { createClient } from "@/lib/supabase/server";
import { FeedClient } from "./feed-client";

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .order("date_iso", { ascending: false })
    .limit(20);

  return <FeedClient initialWorkouts={workouts || []} />;
}
