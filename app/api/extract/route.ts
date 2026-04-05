import { createClient } from "@/lib/supabase/server";
import { EXTRACTION_PROMPT } from "@/lib/extraction-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imagePath } = await request.json();

  // Get a signed URL for the image
  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from("workout-images")
    .createSignedUrl(imagePath, 3600);

  if (urlError || !signedUrlData) {
    return NextResponse.json(
      { error: "Failed to access image" },
      { status: 400 }
    );
  }

  // Fetch image and convert to base64
  const imageResponse = await fetch(signedUrlData.signedUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64 = Buffer.from(imageBuffer).toString("base64");
  const mediaType = imageResponse.headers.get("content-type") || "image/jpeg";

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
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
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
