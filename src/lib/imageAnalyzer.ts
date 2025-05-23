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

export async function analyzeImage(imageUrl: string): Promise<ImageAnalysis> {
  console.time("imageAnalysis");
  try {
    // [REMOVED] // [REMOVED] console.log(`Analyzing image: ${imageUrl}`);

    const response = await retryOpenAICall(async () => {
      return openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert car photographer analyzing images of vehicles. 
            For each image, categorize it according to these specific values:
            
            Angle: ${allowedValues.angle.join(", ")}
            View: ${allowedValues.view.join(", ")}
            Movement: ${allowedValues.movement.join(", ")}
            Time of Day: ${allowedValues.tod.join(", ")}
            Side: ${allowedValues.side.join(", ")}
            
            Also provide a brief, professional description of the image.
            
            Respond in JSON format with these fields:
            {
              "angle": "one of the allowed angles",
              "view": "one of the allowed views",
              "movement": "one of the allowed movements",
              "tod": "one of the allowed times of day",
              "side": "one of the allowed sides",
              "description": "brief professional description"
            }
            
            Only use the exact values provided in the lists above. If you can't determine a value, omit that field.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this car image:",
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1, // Lower temperature for more consistent results
      });
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No analysis result received");
    }

    try {
      const analysis = safeJSONParse(result) as ImageAnalysis;
      console.log(
        `Analysis results for ${imageUrl.substring(0, 30)}...`,
        analysis
      );

      // Validate that the values match our allowed values
      if (
        analysis.angle &&
        !allowedValues.angle.includes(analysis.angle as any)
      ) {
        console.warn(`Invalid angle value: ${analysis.angle}`);
        delete analysis.angle;
      }
      if (analysis.view && !allowedValues.view.includes(analysis.view as any)) {
        console.warn(`Invalid view value: ${analysis.view}`);
        delete analysis.view;
      }
      if (
        analysis.movement &&
        !allowedValues.movement.includes(analysis.movement as any)
      ) {
        console.warn(`Invalid movement value: ${analysis.movement}`);
        delete analysis.movement;
      }
      if (analysis.tod && !allowedValues.tod.includes(analysis.tod as any)) {
        console.warn(`Invalid tod value: ${analysis.tod}`);
        delete analysis.tod;
      }
      if (analysis.side && !allowedValues.side.includes(analysis.side as any)) {
        console.warn(`Invalid side value: ${analysis.side}`);
        delete analysis.side;
      }

      console.timeEnd("imageAnalysis");
      return analysis;
    } catch (error) {
      console.error("Failed to parse analysis result:", result);
      throw new Error("Failed to parse analysis result");
    }
  } catch (error) {
    console.timeEnd("imageAnalysis");
    console.error("Image analysis failed:", error);
    throw error;
  }
}
