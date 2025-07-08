import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import ArticlePrompt from "@/models/ArticlePrompt";
import { dbConnect } from "@/lib/mongodb";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { RateLimiter } from "limiter";

// Configure Vercel runtime
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Initialize API clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up rate limiters
const claudeLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "minute",
});

const openaiLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "minute",
});

// Helper function to estimate tokens
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Helper function to handle rate limiting for API calls
async function callWithRateLimit<T>(
  fn: () => Promise<T>,
  llmProvider: string,
  maxRetries: number = 3
): Promise<T> {
  const limiter = llmProvider === "anthropic" ? claudeLimiter : openaiLimiter;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Wait for rate limit token
      await limiter.removeTokens(1);

      // If not the first attempt, add a delay before retry
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000); // Exponential backoff, max 8s
        console.log(
          `Retry attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      return await fn();
    } catch (error: any) {
      lastError = error;
      console.error(
        `API call failed (attempt ${attempt + 1}/${maxRetries}):`,
        error
      );

      // If it's not a rate limit error, or we're out of retries, throw
      if (
        (error.status !== 429 && !error.message?.includes("Rate limit")) ||
        attempt === maxRetries - 1
      ) {
        throw error;
      }

      // For rate limit errors, continue to next retry
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Rate limit hit, will retry with backoff...");
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const params = { id };
  try {
    const segments = request.nextUrl.pathname.split("/");
    const carId = segments[segments.indexOf("cars") + 1];
    if (!carId || !ObjectId.isValid(carId)) {
      return NextResponse.json(
        { error: "Valid car ID is required" },
        { status: 400 }
      );
    }

    // Connect to database
    await dbConnect();
    const db = await getDatabase();

    // Parse request body
    const {
      promptText,
      aiModel,
      llmProvider = "anthropic",
      modelParams = { temperature: 0.7 },
      carData,
      additionalContext = "",
      lengthPreference = "medium",
    } = await request.json();

    if (!promptText) {
      return NextResponse.json(
        { error: "Prompt text is required" },
        { status: 400 }
      );
    }

    // Fetch car details if not provided in carData
    let car;
    if (!carData || Object.keys(carData).length === 0) {
      car = await db.collection("cars").findOne({ _id: new ObjectId(carId) });
      if (!car) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }
    } else {
      car = carData;
    }

    // Map length preference to word count guidance
    let lengthGuidance = "";
    switch (lengthPreference) {
      case "short":
        lengthGuidance = "Write a concise article (around 300-500 words).";
        break;
      case "medium":
        lengthGuidance =
          "Write a standard-length article (around 800-1200 words).";
        break;
      case "long":
        lengthGuidance =
          "Write a comprehensive article (around 1500-2000 words).";
        break;
      case "very-long":
        lengthGuidance = "Write an in-depth, detailed article (2000+ words).";
        break;
      default:
        lengthGuidance =
          "Write a standard-length article (around 800-1200 words).";
    }

    // Build a comprehensive system prompt that includes car data directly
    const systemPrompt = `You are a professional automotive writer creating detailed, engaging articles for Motive Archive.
- Your task is to write a article for a ${car.year} ${car.make} ${car.model}
- Format your response in clean markdown with appropriate headings
- Focus on accuracy, engaging storytelling, and a tone that appeals to car enthusiasts
- Highlight the special features of this specific vehicle
- Do NOT ask for more information - use what is provided
- Do NOT include image placeholders or references
- Include a compelling title at the beginning
- ${lengthGuidance}`;

    // Add more specific details to the user prompt
    let userPrompt = `${promptText}

Here are the specific details about this ${car.year} ${car.make} ${car.model}:

- Year: ${car.year}
- Make: ${car.make}
- Model: ${car.model}
- VIN: ${car.vin || "Not provided"}
- Color: ${car.color || car.exteriorColor || "Not specified"}
- Interior Color: ${car.interior_color || car.interiorColor || "Not specified"}
${car.mileage ? `- Mileage: ${typeof car.mileage === "object" ? `${car.mileage.value} ${car.mileage.unit || "mi"}` : car.mileage}` : ""}
${car.engine ? `- Engine: ${typeof car.engine === "object" ? car.engine.type || "Standard" : car.engine}` : ""}
${car.transmission ? `- Transmission: ${typeof car.transmission === "object" ? car.transmission.type : car.transmission}` : ""}

${car.description ? `Vehicle description:\n${car.description}` : ""}`;

    // Add additional context if provided
    if (additionalContext && additionalContext.trim()) {
      userPrompt += `\n\nAdditional context and requirements:\n${additionalContext}`;
    }

    userPrompt += `\n\nWrite a ${lengthPreference}-length, comprehensive, engaging article about this vehicle that would appeal to car enthusiasts and collectors.`;

    // Generate article using the appropriate LLM provider
    let articleContent;

    if (llmProvider === "anthropic") {
      articleContent = await callWithRateLimit(async () => {
        const response = await anthropic.messages.create({
          model: aiModel || "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          temperature: modelParams.temperature || 0.7,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });

        const content = response.content[0];
        if (!content || content.type !== "text") {
          throw new Error("Invalid response format from Claude");
        }

        return content.text;
      }, llmProvider);
    } else if (llmProvider === "openai") {
      articleContent = await callWithRateLimit(async () => {
        const response = await openai.chat.completions.create({
          model: aiModel || "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: modelParams.temperature || 0.7,
        });

        return response.choices[0].message.content || "";
      }, llmProvider);
    } else {
      return NextResponse.json(
        { error: "Unsupported LLM provider" },
        { status: 400 }
      );
    }

    // Return the generated article
    return NextResponse.json({
      success: true,
      articleContent,
      carId,
      modelUsed: aiModel,
      llmProvider,
      lengthPreference,
    });
  } catch (error) {
    console.error("Error generating article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate article",
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
