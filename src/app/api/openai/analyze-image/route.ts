import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import sharp from "sharp";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the allowed values for each field
const allowedValues = {
  angle: [
    "front",
    "front 3/4",
    "side",
    "rear 3/4",
    "rear",
    "overhead",
    "under",
  ],
  view: ["exterior", "interior"],
  movement: ["static", "motion"],
  tod: ["sunrise", "day", "sunset", "night"],
  side: ["driver", "passenger", "rear", "overhead"],
} as const;

type AllowedField = keyof typeof allowedValues;
type AllowedValues = (typeof allowedValues)[AllowedField][number];

function cleanMarkdownJSON(text: string | null | undefined): string {
  if (!text) return "{}";
  return text.replace(/```(json)?\n?|\n```$/g, "").trim();
}

function normalizeValue(field: AllowedField, value: string): string {
  if (!value) return "";

  const normalizedValue = value.toLowerCase().trim();

  switch (field) {
    case "movement":
      // Normalize variations of "static"
      if (["stationary", "parked", "still"].includes(normalizedValue)) {
        return "static";
      }
      // Normalize variations of "motion"
      if (
        ["moving", "driving", "in motion", "dynamic"].includes(normalizedValue)
      ) {
        return "motion";
      }
      break;

    case "tod":
      // Normalize time of day
      if (["morning", "dawn", "sunrise"].includes(normalizedValue)) {
        return "sunrise";
      }
      if (["afternoon", "daylight", "daytime"].includes(normalizedValue)) {
        return "day";
      }
      if (["evening", "dusk", "sunset"].includes(normalizedValue)) {
        return "sunset";
      }
      if (["dark", "nighttime"].includes(normalizedValue)) {
        return "night";
      }
      break;
  }

  return (allowedValues[field] as readonly string[]).includes(normalizedValue)
    ? normalizedValue
    : "";
}

function normalizeAnalysis(analysis: any) {
  if (!analysis) return {};

  const normalized = {
    angle: normalizeValue("angle", analysis.angle),
    view: normalizeValue("view", analysis.view),
    movement: normalizeValue("movement", analysis.movement),
    tod: normalizeValue("tod", analysis.tod),
    side: normalizeValue("side", analysis.side),
    description: analysis.description || "",
  };

  return normalized;
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
    .jpeg({ quality: 30 })
    .toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, vehicleInfo } = await request.json();
    console.log("Received request with:", { imageUrl, vehicleInfo });

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    const imageResponse = await fetch(`${imageUrl}/public`);
    console.log("Image fetch status:", imageResponse.status);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    console.log("Successfully converted image to base64");

    const vehicleContext = vehicleInfo
      ? `For reference only (DO NOT MODIFY THESE VALUES): This is a ${
          vehicleInfo.year
        } ${vehicleInfo.make} ${vehicleInfo.model}${
          vehicleInfo.type ? ` ${vehicleInfo.type}` : ""
        }. The car's color is ${
          vehicleInfo.color || "unknown"
        }. Additional details: ${
          vehicleInfo.description
            ? `Description: ${vehicleInfo.description}.`
            : ""
        } ${
          vehicleInfo.condition ? `Condition: ${vehicleInfo.condition}.` : ""
        } ${vehicleInfo.mileage ? `Mileage: ${vehicleInfo.mileage}.` : ""} ${
          vehicleInfo.engine?.type ? `Engine: ${vehicleInfo.engine.type}.` : ""
        }`
      : "";
    console.log("Vehicle context:", vehicleContext);

    console.log("Sending request to OpenAI...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${vehicleContext}

              IMPORTANT: The car specifications provided above are for reference only. DO NOT modify or override these values. Your task is to ONLY analyze the VISUAL ASPECTS of the image.

              Analyze this car image and provide a JSON response with EXACTLY these fields and values:

              {
                "angle": MUST BE ONE OF ["${allowedValues.angle.join('", "')}"],
                "view": MUST BE ONE OF ["${allowedValues.view.join('", "')}"],
                "movement": MUST BE ONE OF ["${allowedValues.movement.join(
                  '", "'
                )}"],
                "tod": MUST BE ONE OF ["${allowedValues.tod.join('", "')}"],
                "side": MUST BE ONE OF ["${allowedValues.side.join('", "')}"],
                "description": "A brief description of what's shown in the image. Use the provided car specifications (year, make, model, color) exactly as given, and only add additional visual details that are directly observable in the image."
              }

              Choose the CLOSEST matching value for each field. DO NOT use any values not listed above.
              DO NOT include any explanations or additional text, ONLY return the JSON object.`,
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
      max_tokens: 1000,
      temperature: 0.1,
    });
    console.log(
      "OpenAI response received:",
      response.choices[0]?.message?.content
    );

    const analysis = response.choices[0]?.message?.content;
    let parsedAnalysis;

    try {
      const cleanedJSON = cleanMarkdownJSON(analysis);
      console.log("Cleaned JSON:", cleanedJSON);
      parsedAnalysis = JSON.parse(cleanedJSON);
      console.log("Parsed analysis:", parsedAnalysis);
      // Normalize the analysis to ensure it matches our allowed values
      parsedAnalysis = normalizeAnalysis(parsedAnalysis);
      console.log("Normalized analysis:", parsedAnalysis);
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
