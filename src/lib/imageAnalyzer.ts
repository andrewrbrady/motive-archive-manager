import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45000, // 45 seconds timeout
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

export interface ImageAnalysis {
  angle?: string;
  view?: string;
  movement?: string;
  tod?: string;
  side?: string;
  description?: string;
}

// Helper function for retrying OpenAI API calls with exponential backoff
async function retryOpenAICall<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // [REMOVED] // [REMOVED] console.log(`Retry attempt ${attempt} for OpenAI analysis`);
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, initialDelay * Math.pow(2, attempt - 1))
        );
      }
      return await fn();
    } catch (error) {
      console.error(
        `Error in attempt ${attempt + 1}/${maxRetries + 1}:`,
        error
      );
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

// Safe JSON parsing helper
function safeJSONParse(text: string): any {
  try {
    // Handle possible code block syntax
    const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("Failed to parse JSON from OpenAI response:", error);
    // [REMOVED] // [REMOVED] console.log("Raw text:", text);
    throw new Error("Failed to parse analysis result");
  }
}

export async function analyzeImage(
  imageUrl: string,
  vehicleInfo?: any,
  promptId?: string
): Promise<ImageAnalysis> {
  console.time("imageAnalysis");
  try {
    // [REMOVED] // [REMOVED] console.log(`Analyzing image: ${imageUrl}`);

    const response = await fetch("/api/openai/analyze-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        vehicleInfo,
        promptId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to analyze image");
    }

    const data = await response.json();
    const analysis = data.analysis as ImageAnalysis;

    console.log(
      `Analysis results for ${imageUrl.substring(0, 30)}...`,
      analysis
    );

    console.timeEnd("imageAnalysis");
    return analysis;
  } catch (error) {
    console.timeEnd("imageAnalysis");
    console.error("Image analysis failed:", error);
    throw error;
  }
}
