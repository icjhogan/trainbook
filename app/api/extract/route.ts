import { createClient } from "@/lib/supabase/server";
import { buildExtractionPrompt } from "@/lib/extraction-prompt";
import { rateLimit, EXTRACT_LIMIT } from "@/lib/rate-limit";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

const anthropic = new Anthropic();

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB (under Claude's 5MB limit)
const MAX_DIMENSION = 2048;

async function resizeIfNeeded(buffer: ArrayBuffer): Promise<Buffer> {
  let img = sharp(Buffer.from(buffer));
  const metadata = await img.metadata();

  // Resize if dimensions are too large
  const w = metadata.width || 0;
  const h = metadata.height || 0;
  if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
    img = img.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside" });
  }

  // Convert to JPEG and compress until under limit
  let quality = 85;
  let result = await img.jpeg({ quality }).toBuffer();

  while (result.length > MAX_IMAGE_BYTES && quality > 30) {
    quality -= 15;
    result = await img.jpeg({ quality }).toBuffer();
  }

  return result;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // AI-spend guardrail: cap vision-extraction calls per user.
  const limit = rateLimit(`extract:${user.id}`, EXTRACT_LIMIT.max, EXTRACT_LIMIT.windowMs);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let imagePath: unknown;
  let anchorYear: unknown;
  try {
    ({ imagePath, anchorYear } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof imagePath !== "string" || !imagePath) {
    return NextResponse.json({ error: "imagePath is required" }, { status: 400 });
  }

  // Optional backfill anchor: accept a plausible 4-digit year, ignore anything else.
  const anchor =
    typeof anchorYear === "string" || typeof anchorYear === "number"
      ? /^\d{4}$/.test(String(anchorYear).trim())
        ? String(anchorYear).trim()
        : undefined
      : undefined;

  // Defense in depth: storage RLS already scopes objects to the user's folder, but
  // reject any path that isn't under this user's prefix before minting a signed URL.
  if (!imagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from("workout-images")
    .createSignedUrl(imagePath, 3600);

  if (urlError || !signedUrlData) {
    return NextResponse.json(
      { error: "Failed to access image" },
      { status: 400 }
    );
  }

  let base64: string;
  try {
    const imageResponse = await fetch(signedUrlData.signedUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to download image" }, { status: 502 });
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    // Resize/compress to stay under Claude's 5MB limit
    const processedImage = await resizeIfNeeded(imageBuffer);
    base64 = processedImage.toString("base64");
  } catch (err) {
    console.error("Image processing error:", err);
    return NextResponse.json({ error: "Image processing failed" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64,
                },
              },
              {
                type: "text",
                text: buildExtractionPrompt(anchor),
              },
            ],
          },
        ],
      },
      { timeout: 25_000 }
    );

    const first = response.content[0];
    if (!first || first.type !== "text") {
      throw new Error("Claude returned no text content");
    }
    let rawText = first.text.trim();

    // Strip markdown fencing if present
    if (rawText.startsWith("```")) {
      rawText = rawText.split("\n").slice(1).join("\n");
      if (rawText.endsWith("```")) {
        rawText = rawText.slice(0, -3);
      }
      rawText = rawText.trim();
    }

    const workouts = JSON.parse(rawText);
    const workoutArray = Array.isArray(workouts) ? workouts : [workouts];

    return NextResponse.json({ workouts: workoutArray });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Extraction error:", message);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
