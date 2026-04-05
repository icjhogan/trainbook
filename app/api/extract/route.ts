import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_PROMPT } from "@/lib/extraction-prompt";
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

  const { imagePath } = await request.json();

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from("workout-images")
    .createSignedUrl(imagePath, 3600);

  if (urlError || !signedUrlData) {
    return NextResponse.json(
      { error: "Failed to access image" },
      { status: 400 }
    );
  }

  const imageResponse = await fetch(signedUrlData.signedUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  // Resize/compress to stay under Claude's 5MB limit
  const processedImage = await resizeIfNeeded(imageBuffer);
  const base64 = processedImage.toString("base64");

  try {
    const response = await anthropic.messages.create({
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
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    let rawText =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "";

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
  } catch (err: any) {
    console.error("Extraction error:", err);
    return NextResponse.json(
      { error: "Extraction failed", details: err.message },
      { status: 500 }
    );
  }
}
