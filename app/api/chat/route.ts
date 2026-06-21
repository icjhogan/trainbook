import { createClient } from "@/lib/supabase/server";
import { getWeekKey } from "@/lib/workout-utils";
import {
  rateLimit,
  CHAT_LIMIT,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_TOTAL_CHARS,
} from "@/lib/rate-limit";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

function buildSystemPrompt(workoutContext: string, stats: { total: number; weeks: number; earliest: string; latest: string }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are an AI training assistant embedded in a personal workout journal app for track & field athletes. Today is ${dateStr}.

## Your role
You are a knowledgeable, supportive training partner — not a generic chatbot. You understand periodization, event-specific technique, recovery, and the mental side of competing. You speak like a thoughtful coach or experienced training partner: direct, specific, warm but not cheerful.

## What you know
You have access to the athlete's training log. They have ${stats.total} workout entries spanning ${stats.weeks} weeks (${stats.earliest} to ${stats.latest}).

When answering questions:
- Reference specific dates and sessions from their data
- Notice patterns: recurring technique cues, volume trends, injury timelines
- Be honest when the data doesn't contain what they're asking about
- If they ask about a workout you can see, give detailed analysis
- If they ask for advice, ground it in what you see in their training history

## What you're good at
- Analyzing training load and volume trends
- Spotting recurring technical cues (what keeps coming up means it's not fixed yet)
- Connecting injuries/pain to training patterns
- Suggesting workout modifications based on their history
- Competition prep analysis (taper, peaking, event-specific readiness)
- Comparing sessions across time to show progress or regression

## How to respond
- Be concise. Athletes don't want essays.
- Use specific numbers and dates from their data
- If they share a workout, analyze it — don't just summarize it back
- Ask clarifying questions if their request is ambiguous
- When suggesting changes, explain the reasoning briefly

## Training Data

${workoutContext || "No workouts recorded yet."}`;
}

export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // AI-spend guardrail: cap requests per user before doing any model work.
  const limit = rateLimit(`chat:${user.id}`, CHAT_LIMIT.max, CHAT_LIMIT.windowMs);
  if (!limit.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  // Bound the payload so a malformed or abusive client can't push an unbounded history.
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("messages must be a non-empty array", { status: 400 });
  }
  if (messages.length > CHAT_MAX_MESSAGES) {
    return new Response("Too many messages", { status: 400 });
  }
  const totalChars = JSON.stringify(messages).length;
  if (totalChars > CHAT_MAX_TOTAL_CHARS) {
    return new Response("Message payload too large", { status: 400 });
  }

  // Fetch workouts for context
  const { data: workouts } = await supabase
    .from("workouts")
    .select("date, date_iso, workout_type, event_focus, exercises, technical_cues, personal_notes, flags")
    .eq("user_id", user.id)
    .order("date_iso", { ascending: false })
    .limit(50);

  // Compute stats
  const dates = (workouts || [])
    .map((w) => w.date_iso)
    .filter(Boolean)
    .sort();
  const weekSet = new Set(dates.map((d: string) => getWeekKey(d)).filter(Boolean));

  const stats = {
    total: workouts?.length || 0,
    weeks: weekSet.size,
    earliest: dates[0] || "N/A",
    latest: dates[dates.length - 1] || "N/A",
  };

  const workoutContext = workouts
    ?.map((w) => {
      const parts = [`${w.date} (${w.date_iso}) — ${w.workout_type}`];
      if (w.event_focus?.length) parts[0] += ` [${w.event_focus.join(", ")}]`;
      for (const ex of w.exercises || []) {
        let line = `- ${ex.description}`;
        if (ex.times?.length) line += ` (${ex.times.join(", ")})`;
        if (ex.rest) line += ` [rest: ${ex.rest}]`;
        parts.push(line);
      }
      if (w.technical_cues?.length)
        parts.push(`Cues: ${w.technical_cues.join("; ")}`);
      if (w.personal_notes) parts.push(`Notes: ${w.personal_notes}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(workoutContext || "", stats),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
