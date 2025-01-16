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
    .resize(150, 150, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, vehicleInfo } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    const imageResponse = await fetch(`${imageUrl}/public`);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

    const vehicleContext = vehicleInfo
      ? `This is a ${vehicleInfo.year} ${vehicleInfo.brand} ${
          vehicleInfo.model
        }${vehicleInfo.type ? ` ${vehicleInfo.type}` : ""}.`
      : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${vehicleContext} Analyze this car image and provide the following details in a JSON format.
              DO NOT INCLUDE ANY OTHER TEXT IN YOUR RESPONSE ASIDE FROM THESE OPTIONS:
              - angle: The viewing angle of the car (front, rear, side, 3/4 front, 3/4 rear)
              - view: The type of view (exterior, interior, detail, engine, interior detail, engine detail)
              - movement: Whether the car appears to be in motion or stationary (static, moving)
              - tod: The time of day (day, night, dusk, dawn, indoor)
              - side: Which side of the car is visible (driver, passenger, n/a)
              - description: A brief description of what's shown in the image`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
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
