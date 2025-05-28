import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { IMAGE_ANALYSIS_CONFIG } from "@/constants/image-analysis";
import { getBaseUrl } from "@/lib/url-utils";

// Set maximum execution time to 90 seconds (increase from 60)
export const maxDuration = 90;

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 second timeout
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

function normalizeValue(
  field: AllowedField,
  value: string | undefined
): string {
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
    angle: normalizeValue("angle", analysis.angle || ""),
    view: normalizeValue("view", analysis.view || ""),
    movement: normalizeValue("movement", analysis.movement || ""),
    tod: normalizeValue("tod", analysis.tod || ""),
    side: normalizeValue("side", analysis.side || ""),
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
    const baseUrl = getBaseUrl();
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

// Utility function to attempt JSON parsing with error handling
function safeJsonParse(text: string, defaultValue: any = {}): any {
  try {
    // First try to remove any markdown code block syntax if present
    const cleanJson = text.replace(/```(json)?\n?|\n?```$/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("JSON Parse Error:", error);
    // [REMOVED] // [REMOVED] console.debug("Failed to parse text:", text);
    return defaultValue;
  }
}

// Retry function for OpenAI API calls
async function retryOpenAICall<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delay = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // [REMOVED] // [REMOVED] console.log(`Retry attempt ${attempt} for OpenAI API call`);
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(
        `OpenAI API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error
      );
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

// Validation function to check if analysis results are acceptable
function validateAnalysisResults(analysis: ImageAnalysis): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
} {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // Check required fields
  if (!analysis.angle) missingFields.push("angle");
  if (!analysis.view) missingFields.push("view");
  if (!analysis.movement) missingFields.push("movement");

  // Check field validity
  if (analysis.angle && !allowedValues.angle.includes(analysis.angle as any)) {
    invalidFields.push(`angle: "${analysis.angle}"`);
  }
  if (analysis.view && !allowedValues.view.includes(analysis.view as any)) {
    invalidFields.push(`view: "${analysis.view}"`);
  }
  if (
    analysis.movement &&
    !allowedValues.movement.includes(analysis.movement as any)
  ) {
    invalidFields.push(`movement: "${analysis.movement}"`);
  }
  if (analysis.tod && !allowedValues.tod.includes(analysis.tod as any)) {
    invalidFields.push(`tod: "${analysis.tod}"`);
  }
  if (analysis.side && !allowedValues.side.includes(analysis.side as any)) {
    invalidFields.push(`side: "${analysis.side}"`);
  }

  const isValid = missingFields.length === 0 && invalidFields.length === 0;

  return { isValid, missingFields, invalidFields };
}

// Enhanced analysis function with validation and retry
async function analyzeImageWithValidation(
  publicImageUrl: string,
  prompt: string,
  model: string,
  maxValidationRetries = 2
): Promise<ImageAnalysis> {
  let lastAnalysis: ImageAnalysis = {};
  let lastValidation: {
    isValid: boolean;
    missingFields: string[];
    invalidFields: string[];
  } = { isValid: false, missingFields: [], invalidFields: [] };

  for (
    let validationAttempt = 0;
    validationAttempt <= maxValidationRetries;
    validationAttempt++
  ) {
    let currentPrompt = prompt;

    // Enhance prompt for retry attempts
    if (validationAttempt > 0) {
      currentPrompt += `\n\nIMPORTANT: Previous analysis attempt failed validation. Issues found:`;

      if (lastValidation.missingFields.length > 0) {
        currentPrompt += `\n- Missing required fields: ${lastValidation.missingFields.join(", ")}`;
      }

      if (lastValidation.invalidFields.length > 0) {
        currentPrompt += `\n- Invalid values returned: ${lastValidation.invalidFields.join(", ")}`;
      }

      currentPrompt += `\n\nPlease ensure you ONLY use these exact values:`;
      currentPrompt += `\n- angle: ${allowedValues.angle.join(", ")}`;
      currentPrompt += `\n- view: ${allowedValues.view.join(", ")}`;
      currentPrompt += `\n- movement: ${allowedValues.movement.join(", ")}`;
      currentPrompt += `\n- tod: ${allowedValues.tod.join(", ")}`;
      currentPrompt += `\n- side: ${allowedValues.side.join(", ")}`;
      currentPrompt += `\n\nDo NOT use any other values. If uncertain, choose the closest match from the allowed values.`;
    }

    console.log(
      `Analysis attempt ${validationAttempt + 1}/${maxValidationRetries + 1}`
    );

    const response = await retryOpenAICall(async () => {
      return openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: currentPrompt,
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
        max_tokens: 800,
        temperature: validationAttempt > 0 ? 0.05 : 0.1, // Lower temperature for retries
      });
    });

    const analysisText = response.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No analysis received from OpenAI");
    }

    // Parse the JSON response
    const analysis = safeJsonParse(analysisText) as ImageAnalysis;

    // Normalize the analysis values
    const normalizedAnalysis = normalizeAnalysis(analysis);

    // Validate the results
    const validation = validateAnalysisResults(normalizedAnalysis);

    console.log(`Validation attempt ${validationAttempt + 1}:`, {
      isValid: validation.isValid,
      missingFields: validation.missingFields,
      invalidFields: validation.invalidFields,
      analysis: normalizedAnalysis,
    });

    if (validation.isValid) {
      console.log(`Analysis successful on attempt ${validationAttempt + 1}`);
      return normalizedAnalysis;
    }

    // Store for next iteration
    lastAnalysis = normalizedAnalysis;
    lastValidation = validation;

    // If this is the last attempt, we'll return what we have
    if (validationAttempt === maxValidationRetries) {
      console.warn(
        `Analysis validation failed after ${maxValidationRetries + 1} attempts. Returning best attempt.`
      );
      console.warn(`Final issues:`, validation);

      // Clean up invalid fields before returning
      const cleanedAnalysis = { ...normalizedAnalysis };
      if (validation.invalidFields.some((f) => f.startsWith("angle:")))
        delete cleanedAnalysis.angle;
      if (validation.invalidFields.some((f) => f.startsWith("view:")))
        delete cleanedAnalysis.view;
      if (validation.invalidFields.some((f) => f.startsWith("movement:")))
        delete cleanedAnalysis.movement;
      if (validation.invalidFields.some((f) => f.startsWith("tod:")))
        delete cleanedAnalysis.tod;
      if (validation.invalidFields.some((f) => f.startsWith("side:")))
        delete cleanedAnalysis.side;

      return cleanedAnalysis;
    }
  }

  return lastAnalysis;
}

export async function POST(request: NextRequest) {
  console.time("analyze-image-total");
  try {
    const { imageUrl, vehicleInfo } = await request.json();
    // [REMOVED] // [REMOVED] console.log("Analyzing image:", imageUrl);
    console.log(
      "Vehicle info:",
      vehicleInfo
        ? JSON.stringify(vehicleInfo).substring(0, 200) + "..."
        : "None provided"
    );

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // Ensure the URL is publicly accessible
    const publicImageUrl = `${imageUrl}/public`;

    // Build context-aware prompt
    let prompt = IMAGE_ANALYSIS_CONFIG.basePrompt;

    // Add style guide
    prompt +=
      "\n\nStyle Guide for Descriptions:\n" + IMAGE_ANALYSIS_CONFIG.styleGuide;

    if (vehicleInfo && vehicleInfo.make && vehicleInfo.model) {
      let vehicleContext = `\n\nVehicle Information:`;
      vehicleContext += `\n- Make: ${vehicleInfo.make}`;
      vehicleContext += `\n- Model: ${vehicleInfo.model}`;

      if (vehicleInfo.year) {
        vehicleContext += `\n- Year: ${vehicleInfo.year}`;
      }

      if (vehicleInfo.engine?.type) {
        vehicleContext += `\n- Engine: ${vehicleInfo.engine.type}`;
      }

      if (vehicleInfo.condition) {
        vehicleContext += `\n- Condition: ${vehicleInfo.condition}`;
      }

      if (vehicleInfo.color) {
        vehicleContext += `\n- Color: ${vehicleInfo.color}`;
      }

      if (vehicleInfo.additionalContext) {
        vehicleContext += `\n\nAdditional context: ${vehicleInfo.additionalContext}`;
      }

      prompt +=
        vehicleContext +
        "\n\nPlease analyze the image with this vehicle information in mind and ensure the description accurately reflects these details.\n\n";
    }

    prompt +=
      "Provide:\n- angle (front, front 3/4, side, rear 3/4, rear, overhead, under)\n- view (exterior, interior)\n- movement (static, motion)\n- tod (sunrise, day, sunset, night)\n- side (driver, passenger, rear, overhead)\n- description (brief description of what's shown in the image, focusing on visible features)";

    console.time("openai-api-call");

    // Use lower-resource model and implement retry logic
    const model = "gpt-4o-mini"; // Use mini model for faster response

    // Use the enhanced analysis function with validation and retry
    const normalizedAnalysis = await analyzeImageWithValidation(
      publicImageUrl,
      prompt,
      model,
      2 // maxValidationRetries
    );

    console.timeEnd("openai-api-call");
    console.timeEnd("analyze-image-total");
    console.log(
      "Analysis complete:",
      JSON.stringify(normalizedAnalysis).substring(0, 200) + "..."
    );

    return NextResponse.json({ analysis: normalizedAnalysis });
  } catch (error) {
    console.timeEnd("analyze-image-total");
    console.error("Error analyzing image:", error);

    // Create a structured error response
    const errorResponse = {
      error: "Failed to analyze image",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
