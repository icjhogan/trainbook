import { createClient } from "@/lib/supabase/server";
import {
  rateLimit,
  CHAT_LIMIT,
  CHAT_MAX_MESSAGES,
  CHAT_MAX_TOTAL_CHARS,
} from "@/lib/rate-limit";
import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  jsonSchema,
  type UIMessage,
  type ToolSet,
} from "ai";
import { createSupabaseReader, type ScopedWorkoutReader } from "@/lib/agent/reader";
import { toolDefinitions } from "@/lib/agent/tools";

// Multi-step agentic loop + per-step embedding/RRF round-trips need more than the old 30s.
// On Vercel Fluid Compute the platform default is generous; 60s gives the loop headroom and
// still bounds a runaway request. stopWhen below caps the step count.
export const maxDuration = 60;

function buildSystemPrompt(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are an AI training assistant embedded in a personal workout journal for a heptathlon athlete. Today is ${dateStr}.

## Your role
A knowledgeable, supportive training partner — like a thoughtful coach. Direct, specific, warm but not cheerful. You understand periodization, the 7 heptathlon events, recovery, and competing.

## How you access the log — ALWAYS use your tools
You do NOT have the training log in front of you. You read it through tools, over the athlete's ENTIRE history (not just recent sessions):
- **search_workouts** — find sessions by date range / event / type.
- **semantic_search** — find sessions by meaning ("the session where my hamstring flared").
- **get_workout** — pull one full session by id or date.
- **compute_metric** — exact numbers (volume, weekly_volume, event_coverage, session_count). NEVER estimate or eyeball a number — call this tool. If a number can't be computed, say so.
- **event_coverage** — how much each event has been trained.

Call tools as needed, including several in sequence (search, then compute, then answer). Answer once you have what you need.

## Grounding and citations (important)
- Every time you reference a specific session, append a citation marker immediately after it: \`[[<workout-id>]]\`, using the exact \`id\` from a tool result. Example: "Your 300m volume jumped in early March [[a1b2-...]]."
- Only cite ids that appeared in a tool result this turn. Never invent an id.
- If a tool returns nothing, an empty list, or an \`error\` field, say plainly that you couldn't find/compute it — do NOT fabricate an answer or a citation.

## You are read-only
You can read and analyze, but you cannot log, edit, or change anything in the journal. If asked to add or change a workout or plan, explain that you can't make changes — they can do that themselves in the app.

## Style
Concise — athletes don't want essays. Use specific numbers and dates from tool results. Explain reasoning briefly when giving advice.`;
}

// Adapt the transport-agnostic tool registry to an AI-SDK ToolSet bound to this request's
// RLS-scoped reader. Tool errors are returned as structured results (never thrown) so the
// model can acknowledge a failure instead of fabricating around it (R7).
function buildChatTools(reader: ScopedWorkoutReader): ToolSet {
  const tools: ToolSet = {};
  for (const def of toolDefinitions) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: jsonSchema(def.inputSchema as Parameters<typeof jsonSchema>[0]),
      execute: async (args) => {
        try {
          return await def.handler(reader, args as Record<string, unknown>);
        } catch (err) {
          return { error: err instanceof Error ? err.message : "tool failed" };
        }
      },
    });
  }
  return tools;
}

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

  const reader = createSupabaseReader(supabase, user.id);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: buildChatTools(reader),
    // Enables multi-step tool-calling AND bounds it — without this, ai@6 defaults to
    // stepCountIs(1) and the agent would stop after a single tool call (KTD1).
    stopWhen: stepCountIs(5),
    // Return a clean app-level error just under the 60s function ceiling rather than being
    // hard-killed mid-stream if the loop runs long.
    timeout: { totalMs: 55_000 },
  });

  return result.toUIMessageStreamResponse();
}
