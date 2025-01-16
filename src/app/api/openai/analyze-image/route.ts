import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanMarkdownJSON(text: string | null | undefined): string {
  if (!text) return "{}";
  // Remove markdown code block syntax and any language identifier
  return text.replace(/```(json)?\n?|\n```$/g, "").trim();
}

async function resizeImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return sharp(buffer)
    .resize(800, 800, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    const publicImageUrl = `${imageUrl}/public`;

    // Resize image before sending to OpenAI
    const resizedImageBuffer = await resizeImage(publicImageUrl);
    const base64Image = resizedImageBuffer.toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this car image and provide the following details in JSON format with these exact keys:
{
  "angle": "front" | "rear" | "side" | "3/4 front" | "3/4 rear" | "interior" | "engine" | "other",
  "view": "exterior" | "interior",
  "movement": "static" | "moving",
  "tod": "day" | "night" | "dusk/dawn",
  "side": "driver" | "passenger" | "rear" | "aerial",
  "primaryColor": string,
  "description": string,
  "notableFeatures": string
}

Choose only from the provided options for each field where options are given. Keep descriptions concise.`,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const analysis = response.choices[0]?.message?.content;
    let parsedAnalysis;

    try {
      const cleanedJSON = cleanMarkdownJSON(analysis);
      parsedAnalysis = JSON.parse(cleanedJSON);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      parsedAnalysis = { error: "Failed to parse analysis" };
    }

    return NextResponse.json({
      success: true,
      analysis: parsedAnalysis,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image" },
      { status: 500 }
    );
  }
}
