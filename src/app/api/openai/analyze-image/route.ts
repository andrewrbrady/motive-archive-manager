import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { IMAGE_ANALYSIS_CONFIG } from "@/constants/image-analysis";
import { getBaseUrl } from "@/lib/url-utils";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
  // Car-specific fields
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  description?: string;

  // General image fields
  content_type?: string;
  primary_subject?: string;
  dominant_colors?: string[];
  style?: string;
  usage_context?: string;
  has_text?: boolean;
  has_brand_elements?: boolean;

  // Allow any additional fields
  [key: string]: any;
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

function normalizeAnalysis(
  analysis: ImageAnalysis,
  isCarImage: boolean = true
): ImageAnalysis {
  if (!analysis) return {};

  if (isCarImage) {
    // Normalize car-specific fields
    const normalized = {
      angle: normalizeValue("angle", analysis.angle || ""),
      view: normalizeValue("view", analysis.view || ""),
      movement: normalizeValue("movement", analysis.movement || ""),
      tod: normalizeValue("tod", analysis.tod || ""),
      side: normalizeValue("side", analysis.side || ""),
      description: analysis.description || "",
    };
    return normalized;
  } else {
    // For general images, return all fields as-is (no normalization needed)
    return { ...analysis };
  }
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
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.debug("Failed to parse text:", text);
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
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Retry attempt ${attempt} for OpenAI API call`);
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1))
        );
      }
      return await fn();
    } catch (error) {
      lastError = error;

      // Enhanced error logging with more details
      const errorDetails = {
        attempt: attempt + 1,
        maxAttempts: maxRetries + 1,
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        // Include additional OpenAI-specific error details if available
        ...(error && typeof error === "object" && "status" in error
          ? {
              status: (error as any).status,
              code: (error as any).code,
              type: (error as any).type,
              param: (error as any).param,
            }
          : {}),
      };

      console.error(
        `OpenAI API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
        errorDetails
      );

      // If this is an invalid_image_url error, provide more specific guidance
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as any).code === "invalid_image_url"
      ) {
        console.error("Image URL validation failed. This usually means:");
        console.error("1. The image URL is not publicly accessible");
        console.error("2. The URL does not point directly to an image file");
        console.error("3. The image host is blocking OpenAI's requests");
        console.error("4. The URL format is incorrect or malformed");
      }
    }
  }

  // Provide a more detailed error message when all retries fail
  const finalError = new Error(
    `OpenAI API call failed after ${maxRetries + 1} attempts. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );

  // Preserve the original error details
  if (lastError && typeof lastError === "object") {
    Object.assign(finalError, lastError);
  }

  throw finalError;
}

// Validation function to check if analysis results are acceptable
function validateAnalysisResults(
  analysis: ImageAnalysis,
  isCarImage: boolean = true
): {
  isValid: boolean;
  missingFields: string[];
  invalidFields: string[];
} {
  const missingFields: string[] = [];
  const invalidFields: string[] = [];

  // Check required fields only for car images
  if (isCarImage) {
    if (!analysis.angle) missingFields.push("angle");
    if (!analysis.view) missingFields.push("view");
    if (!analysis.movement) missingFields.push("movement");
  }

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
  analysisImageUrl: string,
  prompt: string,
  model: string,
  maxValidationRetries = 2,
  isCarImage: boolean = true
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
                  url: analysisImageUrl,
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
    const normalizedAnalysis = normalizeAnalysis(analysis, isCarImage);

    // Validate the results
    const validation = validateAnalysisResults(normalizedAnalysis, isCarImage);

    console.log(`Validation attempt ${validationAttempt + 1}:`, {
      isValid: validation.isValid,
      missingFields: validation.missingFields,
      invalidFields: validation.invalidFields,
      analysis: normalizedAnalysis,
    });

    if (validation.isValid) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Analysis successful on attempt ${validationAttempt + 1}`);
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
    const { imageUrl, vehicleInfo, promptId, modelId, imageContext } =
      await request.json();
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Analyzing image:", imageUrl);
    console.log(
      "Vehicle info:",
      vehicleInfo
        ? JSON.stringify(vehicleInfo).substring(0, 200) + "..."
        : "None provided"
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Prompt ID:", promptId || "Using default");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Model ID:", modelId || "Using default");
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Image Context:", imageContext || "None provided");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // Properly construct the image URL for analysis
    let analysisImageUrl = imageUrl;

    // Handle Cloudflare Images URLs
    if (imageUrl.includes("imagedelivery.net")) {
      // Extract the base URL (account hash + image ID) and use an appropriate variant for analysis
      const cloudflareMatch = imageUrl.match(
        /https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)/
      );

      if (cloudflareMatch) {
        const [, accountHash, imageId] = cloudflareMatch;
        // Use a medium-sized variant for analysis (not highres to save bandwidth and costs)
        // OpenAI doesn't need massive images for analysis - medium quality is sufficient
        analysisImageUrl = `https://imagedelivery.net/${accountHash}/${imageId}/w=1200,q=85`;
        console.log(
          "Constructed analysis image URL (optimized size):",
          analysisImageUrl
        );
      } else {
        console.warn("Could not parse Cloudflare URL format:", imageUrl);
        // Fallback: if URL doesn't match expected format, try to add a reasonable variant
        if (
          !imageUrl.includes("/public") &&
          !imageUrl.match(/\/[a-zA-Z]+$/) &&
          !imageUrl.includes("w=")
        ) {
          analysisImageUrl = `${imageUrl}/w=1200,q=85`;
        }
      }
    } else {
      // For non-Cloudflare URLs, use as-is
      analysisImageUrl = imageUrl;
    }

    // Validate that the constructed URL is accessible
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Final image URL for analysis:", analysisImageUrl);

    // Basic URL validation
    try {
      new URL(analysisImageUrl);
    } catch (error) {
      console.error("Invalid URL constructed:", analysisImageUrl);
      return NextResponse.json(
        {
          error: "Invalid image URL",
          details: `Constructed URL is malformed: ${analysisImageUrl}`,
          originalUrl: imageUrl,
        },
        { status: 400 }
      );
    }

    // Optional: Quick accessibility check for Cloudflare URLs
    if (analysisImageUrl.includes("imagedelivery.net")) {
      try {
        console.log(
          "Performing quick accessibility check for Cloudflare image..."
        );
        const headResponse = await fetch(analysisImageUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!headResponse.ok) {
          console.warn(
            `Image accessibility check failed: ${headResponse.status} ${headResponse.statusText}`
          );
          console.warn(`URL: ${analysisImageUrl}`);

          if (headResponse.status === 404) {
            return NextResponse.json(
              {
                error: "Image not found",
                details: `The image at ${analysisImageUrl} returned 404 Not Found. The image may have been deleted or the URL is incorrect.`,
                originalUrl: imageUrl,
                status: headResponse.status,
              },
              { status: 404 }
            );
          }
        } else {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Image accessibility check passed");
        }
      } catch (accessibilityError) {
        console.warn(
          "Could not perform accessibility check:",
          accessibilityError instanceof Error
            ? accessibilityError.message
            : String(accessibilityError)
        );
        // Don't fail the request if accessibility check fails - continue with OpenAI analysis
      }
    }

    // Build context-aware prompt
    let prompt = IMAGE_ANALYSIS_CONFIG.basePrompt;

    // If a custom prompt ID is provided, fetch it from the database
    if (promptId) {
      try {
        const { db } = await connectToDatabase();
        const customPrompt = await db
          .collection("imageAnalysisPrompts")
          .findOne({
            _id: new ObjectId(promptId),
            isActive: true,
          });

        if (customPrompt) {
          prompt = customPrompt.prompt;
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using custom prompt:", customPrompt.name);
        } else {
          console.warn("Custom prompt not found or inactive, using default");
        }
      } catch (error) {
        console.error("Error fetching custom prompt:", error);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Falling back to default prompt");
      }
    }

    // Add user-provided image context if available (ALWAYS, regardless of prompt type)
    if (imageContext && imageContext.trim()) {
      prompt += `\n\nUser provided context: ${imageContext.trim()}\n\nPlease incorporate this context into your analysis and description.\n\n`;
    }

    // Only add car-specific instructions if using default prompt or dealing with car images
    if (!promptId) {
      // Add style guide for default prompt
      prompt +=
        "\n\nStyle Guide for Descriptions:\n" +
        IMAGE_ANALYSIS_CONFIG.styleGuide;
    }

    // ALWAYS add vehicle context when available, regardless of prompt type
    if (vehicleInfo && vehicleInfo.make && vehicleInfo.model) {
      let vehicleContext = `\n\nVehicle Information:`;
      vehicleContext += `\n- Make: ${vehicleInfo.make}`;
      vehicleContext += `\n- Model: ${vehicleInfo.model}`;

      if (vehicleInfo.year) {
        vehicleContext += `\n- Year: ${vehicleInfo.year}`;
      }

      if (vehicleInfo.vin) {
        vehicleContext += `\n- VIN: ${vehicleInfo.vin}`;
      }

      if (vehicleInfo.color) {
        vehicleContext += `\n- Exterior Color: ${vehicleInfo.color}`;
      }

      if (vehicleInfo.interior_color) {
        vehicleContext += `\n- Interior Color: ${vehicleInfo.interior_color}`;
      }

      if (vehicleInfo.condition) {
        vehicleContext += `\n- Condition: ${vehicleInfo.condition}`;
      }

      if (vehicleInfo.type) {
        vehicleContext += `\n- Vehicle Type: ${vehicleInfo.type}`;
      }

      // Engine specifications
      if (vehicleInfo.engine) {
        let engineInfo = "";
        if (vehicleInfo.engine.type) {
          engineInfo += `Type: ${vehicleInfo.engine.type}`;
        }
        if (vehicleInfo.engine.displacement) {
          engineInfo += `${engineInfo ? ", " : ""}Displacement: ${vehicleInfo.engine.displacement.value}${vehicleInfo.engine.displacement.unit || "L"}`;
        }
        if (vehicleInfo.engine.power) {
          engineInfo += `${engineInfo ? ", " : ""}Power: ${vehicleInfo.engine.power.hp}hp`;
          if (vehicleInfo.engine.power.kW) {
            engineInfo += ` (${vehicleInfo.engine.power.kW}kW)`;
          }
        }
        if (vehicleInfo.engine.torque) {
          engineInfo += `${engineInfo ? ", " : ""}Torque: ${vehicleInfo.engine.torque["lb-ft"]}lb-ft`;
          if (vehicleInfo.engine.torque.Nm) {
            engineInfo += ` (${vehicleInfo.engine.torque.Nm}Nm)`;
          }
        }
        if (vehicleInfo.engine.cylinders) {
          engineInfo += `${engineInfo ? ", " : ""}Cylinders: ${vehicleInfo.engine.cylinders}`;
        }
        if (vehicleInfo.engine.fuelType) {
          engineInfo += `${engineInfo ? ", " : ""}Fuel: ${vehicleInfo.engine.fuelType}`;
        }
        if (engineInfo) {
          vehicleContext += `\n- Engine: ${engineInfo}`;
        }
      }

      // Transmission
      if (vehicleInfo.transmission) {
        let transmissionInfo = vehicleInfo.transmission.type;
        if (vehicleInfo.transmission.speeds) {
          transmissionInfo += ` (${vehicleInfo.transmission.speeds}-speed)`;
        }
        vehicleContext += `\n- Transmission: ${transmissionInfo}`;
      }

      // Mileage
      if (vehicleInfo.mileage) {
        vehicleContext += `\n- Mileage: ${vehicleInfo.mileage.value.toLocaleString()} ${vehicleInfo.mileage.unit || "miles"}`;
      }

      // Manufacturing details
      if (vehicleInfo.manufacturing) {
        let manufacturingInfo = "";
        if (vehicleInfo.manufacturing.series) {
          manufacturingInfo += `Series: ${vehicleInfo.manufacturing.series}`;
        }
        if (vehicleInfo.manufacturing.trim) {
          manufacturingInfo += `${manufacturingInfo ? ", " : ""}Trim: ${vehicleInfo.manufacturing.trim}`;
        }
        if (vehicleInfo.manufacturing.bodyClass) {
          manufacturingInfo += `${manufacturingInfo ? ", " : ""}Body Class: ${vehicleInfo.manufacturing.bodyClass}`;
        }
        if (manufacturingInfo) {
          vehicleContext += `\n- Manufacturing: ${manufacturingInfo}`;
        }
      }

      // Performance specs
      if (vehicleInfo.performance) {
        let performanceInfo = "";
        if (vehicleInfo.performance["0_to_60_mph"]) {
          performanceInfo += `0-60mph: ${vehicleInfo.performance["0_to_60_mph"].value}${vehicleInfo.performance["0_to_60_mph"].unit}`;
        }
        if (vehicleInfo.performance.top_speed) {
          performanceInfo += `${performanceInfo ? ", " : ""}Top Speed: ${vehicleInfo.performance.top_speed.value}${vehicleInfo.performance.top_speed.unit}`;
        }
        if (performanceInfo) {
          vehicleContext += `\n- Performance: ${performanceInfo}`;
        }
      }

      // Interior features
      if (vehicleInfo.interior_features) {
        let interiorInfo = "";
        if (vehicleInfo.interior_features.seats) {
          interiorInfo += `${vehicleInfo.interior_features.seats} seats`;
        }
        if (vehicleInfo.interior_features.upholstery) {
          interiorInfo += `${interiorInfo ? ", " : ""}${vehicleInfo.interior_features.upholstery} upholstery`;
        }
        if (
          vehicleInfo.interior_features.features &&
          vehicleInfo.interior_features.features.length > 0
        ) {
          interiorInfo += `${interiorInfo ? ", " : ""}Features: ${vehicleInfo.interior_features.features.join(", ")}`;
        }
        if (interiorInfo) {
          vehicleContext += `\n- Interior: ${interiorInfo}`;
        }
      }

      // Dimensions
      if (vehicleInfo.dimensions) {
        let dimensionsInfo = "";
        if (vehicleInfo.dimensions.length) {
          dimensionsInfo += `Length: ${vehicleInfo.dimensions.length.value}${vehicleInfo.dimensions.length.unit}`;
        }
        if (vehicleInfo.dimensions.width) {
          dimensionsInfo += `${dimensionsInfo ? ", " : ""}Width: ${vehicleInfo.dimensions.width.value}${vehicleInfo.dimensions.width.unit}`;
        }
        if (vehicleInfo.dimensions.height) {
          dimensionsInfo += `${dimensionsInfo ? ", " : ""}Height: ${vehicleInfo.dimensions.height.value}${vehicleInfo.dimensions.height.unit}`;
        }
        if (vehicleInfo.dimensions.weight) {
          dimensionsInfo += `${dimensionsInfo ? ", " : ""}Weight: ${vehicleInfo.dimensions.weight.value}${vehicleInfo.dimensions.weight.unit}`;
        }
        if (dimensionsInfo) {
          vehicleContext += `\n- Dimensions: ${dimensionsInfo}`;
        }
      }

      if (vehicleInfo.location) {
        vehicleContext += `\n- Location: ${vehicleInfo.location}`;
      }

      if (vehicleInfo.status) {
        vehicleContext += `\n- Status: ${vehicleInfo.status}`;
      }

      if (vehicleInfo.description) {
        vehicleContext += `\n- Description: ${vehicleInfo.description}`;
      }

      if (vehicleInfo.additionalContext) {
        vehicleContext += `\n\nAdditional context: ${vehicleInfo.additionalContext}`;
      }

      prompt +=
        vehicleContext +
        "\n\nPlease analyze the image with this vehicle information in mind and ensure the description accurately reflects these details.\n\n";
    }

    // Add default analysis instructions only for default prompt
    if (!promptId) {
      prompt +=
        "Provide:\n- angle (front, front 3/4, side, rear 3/4, rear, overhead, under)\n- view (exterior, interior)\n- movement (static, motion)\n- tod (sunrise, day, sunset, night)\n- side (driver, passenger, rear, overhead)\n- description (brief description of what's shown in the image, focusing on visible features)";
    }

    console.time("openai-api-call");

    // Use the provided model or fall back to default
    let selectedModel = modelId;
    if (!selectedModel) {
      const defaultModel = IMAGE_ANALYSIS_CONFIG.availableModels.find(
        (model) => model.isDefault
      );
      selectedModel = defaultModel?.id || "gpt-4o-mini";
    }

    // Validate that the selected model is in our allowed list
    const isValidModel = IMAGE_ANALYSIS_CONFIG.availableModels.some(
      (model) => model.id === selectedModel
    );
    if (!isValidModel) {
      console.warn(`Invalid model ${selectedModel}, falling back to default`);
      const defaultModel = IMAGE_ANALYSIS_CONFIG.availableModels.find(
        (model) => model.isDefault
      );
      selectedModel = defaultModel?.id || "gpt-4o-mini";
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Using OpenAI model:", selectedModel);

    // Determine if this is a car image based on vehicle info
    // Don't treat general uploads as car images even if they have vehicleInfo
    const isCarImage = !!(
      vehicleInfo &&
      vehicleInfo.make &&
      vehicleInfo.model &&
      vehicleInfo.year &&
      vehicleInfo.make !== "Unknown" &&
      vehicleInfo.model !== "General Upload"
    );

    // Use the enhanced analysis function with validation and retry
    const normalizedAnalysis = await analyzeImageWithValidation(
      analysisImageUrl,
      prompt,
      selectedModel,
      2, // maxValidationRetries
      isCarImage
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
