import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are an AI assistant for an athlete's training journal. You have access to their workout history and can answer questions about their training.

Be concise and direct. Use the workout data provided to give specific, data-backed answers. Reference specific dates and sessions when relevant.

If the user asks about something not in the data, say so — don't guess.`;

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Fetch recent workouts for context
  const { data: workouts } = await supabase
    .from("workouts")
    .select("date, date_iso, workout_type, event_focus, exercises, technical_cues, personal_notes, flags")
    .eq("user_id", user.id)
    .order("date_iso", { ascending: false })
    .limit(50);

  const workoutContext = workouts
    ?.map((w) => {
      const parts = [`${w.date} — ${w.workout_type}`];
      if (w.event_focus?.length) parts[0] += ` [${w.event_focus.join(", ")}]`;
      for (const ex of w.exercises || []) {
        let line = `- ${ex.description}`;
        if (ex.times?.length) line += ` (${ex.times.join(", ")})`;
        parts.push(line);
      }
      if (w.technical_cues?.length)
        parts.push(`Cues: ${w.technical_cues.join("; ")}`);
      if (w.personal_notes) parts.push(`Notes: ${w.personal_notes}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const systemMessage = `${SYSTEM_PROMPT}\n\n## Training Data\n\n${workoutContext || "No workouts recorded yet."}`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: systemMessage,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
