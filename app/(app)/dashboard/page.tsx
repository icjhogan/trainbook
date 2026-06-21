import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: workouts, error } = await supabase
    .from("workouts")
    .select("*")
    .order("date_iso", { ascending: true });

  // Surface a real fetch failure to the error boundary instead of rendering an
  // empty dashboard that looks like "no data yet".
  if (error) throw error;

  return <DashboardClient workouts={workouts || []} />;
}
