import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Set maximum execution time to 60 seconds
export const maxDuration = 60;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImageAnalysis {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  description?: string;
}

interface VehicleInfo {
  year?: string | number;
  make?: string;
  model?: string;
  type?: string;
  color?: string;
  description?: string;
  condition?: string;
  mileage?: {
    value: number;
    unit?: string;
  };
  engine?: {
    type?: string;
    displacement?: {
      value: number;
      unit: string;
    };
    power?: {
      hp: number;
      kW: number;
    };
    torque?: {
      "lb-ft": number;
      Nm: number;
    };
  };
  additionalContext?: string;
}

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

function normalizeAnalysis(analysis: ImageAnalysis): ImageAnalysis {
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

async function validateColorWithSerper(
  color: string,
  vehicleInfo: VehicleInfo
) {
  if (
    !color ||
    !vehicleInfo?.make ||
    !vehicleInfo?.model ||
    !vehicleInfo?.year
  ) {
    return color;
  }

  try {
    // Get the base URL from the environment, defaulting to localhost for development
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/serper`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        make: vehicleInfo.make,
        model: vehicleInfo.model,
        year: vehicleInfo.year,
        color: color,
      }),
    });

    if (!response.ok) {
      console.warn("Failed to validate color with Serper");
      return color;
    }

    const data = await response.json();
    if (data.success && data.results.length > 0) {
      // Use the first result as it's likely the most relevant
      return (
        data.results[0].title.match(/\b\w+\s+(?=color|paint)\b/i)?.[0] || color
      );
    }

    return color;
  } catch (error) {
    console.error("Error validating color:", error);
    return color;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { imageUrl, vehicleInfo } = await request.json();
    console.log("Received request with:", { imageUrl, vehicleInfo });

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // Ensure the URL is publicly accessible
    const publicImageUrl = `${imageUrl}/public`;

    // First validate that we can access the image
    try {
      const imageResponse = await fetch(publicImageUrl);
      if (!imageResponse.ok) {
        console.error("Failed to fetch image:", imageResponse.statusText);
        return NextResponse.json(
          { error: "Failed to fetch image" },
          { status: imageResponse.status }
        );
      }
    } catch (error) {
      console.error("Error validating image URL:", error);
      return NextResponse.json(
        { error: "Failed to validate image URL" },
        { status: 400 }
      );
    }

    // First, get color from OpenAI
    try {
      const colorResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What is the color of this car? Respond with ONLY the color name, nothing else. If you can't determine the color, respond with 'unknown'.",
              },
              {
                type: "image_url",
                image_url: {
                  url: publicImageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 10,
      });

      const detectedColor =
        colorResponse.choices[0]?.message?.content?.trim().toLowerCase() ||
        "unknown";

      // Validate color with Serper if a color was detected
      const validatedColor =
        detectedColor !== "unknown"
          ? await validateColorWithSerper(detectedColor, vehicleInfo)
          : detectedColor;

      // Now proceed with the regular image analysis
      const vehicleContext = vehicleInfo
        ? `For reference only (DO NOT MODIFY THESE VALUES): This is a ${
            vehicleInfo.year || "unknown year"
          } ${vehicleInfo.make} ${vehicleInfo.model}${
            vehicleInfo.type ? ` ${vehicleInfo.type}` : ""
          }. The car's color is ${
            validatedColor || "unknown"
          }. Additional details: ${
            vehicleInfo.description
              ? `Description: ${vehicleInfo.description}.`
              : ""
          } ${
            vehicleInfo.condition ? `Condition: ${vehicleInfo.condition}.` : ""
          } ${
            vehicleInfo.mileage?.value
              ? `Mileage: ${vehicleInfo.mileage.value}${
                  vehicleInfo.mileage.unit || "mi"
                }.`
              : ""
          } ${
            vehicleInfo.engine?.type
              ? `Engine: ${vehicleInfo.engine.type}${
                  vehicleInfo.engine.displacement
                    ? ` (${vehicleInfo.engine.displacement.value}${vehicleInfo.engine.displacement.unit})`
                    : ""
                }${
                  vehicleInfo.engine.power
                    ? `, ${vehicleInfo.engine.power.hp}hp/${vehicleInfo.engine.power.kW}kW`
                    : ""
                }${
                  vehicleInfo.engine.torque
                    ? `, ${vehicleInfo.engine.torque["lb-ft"]}lb-ft/${vehicleInfo.engine.torque.Nm}Nm`
                    : ""
                }.`
              : ""
          } ${
            vehicleInfo.additionalContext
              ? `\n\nUser provided context: ${vehicleInfo.additionalContext}`
              : ""
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

                STRICT RULES FOR DESCRIPTION:
                ❌ NEVER use these words or concepts:
                - "used" (all cars are used)
                - "stylish"
                - "modern"
                - "classic"
                - "sleek"
                - "sporty"
                - Any subjective or opinion-based descriptors
                - Any assessment of the car's condition or quality
                
                ✅ ONLY include:
                - Factual, observable details from the image in a concise tone
                - Exact specifications provided (year, make, model, color)
                - Physical features visible in the image
                - Specific parts or components that are clearly visible
                - Actual position, angle, or viewpoint of the car

                Analyze this car image and provide a JSON response with EXACTLY these fields and values:

                {
                  "angle": MUST BE ONE OF ["${allowedValues.angle.join(
                    '", "'
                  )}"],
                  "view": MUST BE ONE OF ["${allowedValues.view.join('", "')}"],
                  "movement": MUST BE ONE OF ["${allowedValues.movement.join(
                    '", "'
                  )}"],
                  "tod": MUST BE ONE OF ["${allowedValues.tod.join('", "')}"],
                  "side": MUST BE ONE OF ["${allowedValues.side.join('", "')}"],
                  "description": "A strictly factual description of what's visible in the image. 
                  Use the provided car specifications (year, make, model, color) exactly as given.
                  Focus ONLY on what is physically observable in the image."
                  If year, make, model, or color are not visible in the image, do not set or describe them as "unknown".
                }`,
              },
              {
                type: "image_url",
                image_url: {
                  url: publicImageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 250,
        temperature: 0.1,
      });

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
      console.error("OpenAI API error:", error);
      console.error("OpenAI API error details:", {
        message: error.message,
        status: error.status,
        code: error.code,
        type: error.type,
      });
      return NextResponse.json(
        {
          error: "Failed to analyze image with OpenAI",
          details: error.message,
        },
        { status: error.status || 500 }
      );
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", details: error.message },
      { status: 500 }
    );
  }
}
