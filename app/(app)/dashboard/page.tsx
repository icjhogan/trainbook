import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: workouts } = await supabase
    .from("workouts")
    .select("*")
    .order("date_iso", { ascending: true });

  return <DashboardClient workouts={workouts || []} />;
}
