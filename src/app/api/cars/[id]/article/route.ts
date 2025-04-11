import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RateLimiter } from "limiter";
import type { ModelType } from "@/types/models";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getApiUrl } from "@/lib/utils";
import { Car } from "@/types/car";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client as s3 } from "@/lib/s3";

// Configure Vercel runtime
export const maxDuration = 60;
export const runtime = "nodejs";

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add these utility functions at the top level
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkContent(content: string, maxTokens: number = 6000): string {
  const paragraphs = content.split("\n\n");
  let currentChunk = "";
  let currentTokens = 0;
  const reservedTokens = 1000; // Reserve tokens for system prompt and response

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (currentTokens + paragraphTokens > maxTokens - reservedTokens) {
      break;
    }
    currentChunk += paragraph + "\n\n";
    currentTokens += paragraphTokens;
  }

  console.log("[DEBUG] chunkContent - Chunked content stats:", {
    originalTokens: estimateTokens(content),
    chunkedTokens: currentTokens,
    maxAllowedTokens: maxTokens,
    reservedTokens,
  });

  return currentChunk;
}

// Update the rate limiters
const claudeLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "minute",
});

const openaiLimiter = new RateLimiter({
  tokensPerInterval: 2,
  interval: "minute",
});

// Helper function to handle rate limiting for API calls with retries
async function callWithRateLimit<T>(
  fn: () => Promise<T>,
  model: ModelType,
  maxRetries: number = 3
): Promise<T> {
  const limiter =
    model === "claude-3-5-sonnet-20241022" ? claudeLimiter : openaiLimiter;
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
      console.log("Rate limit hit, will retry with backoff...");
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

interface ArticleStage {
  stage: "planning" | "drafting" | "polishing";
  content: string;
  timestamp: Date;
}

interface ArticleMetadata {
  _id?: ObjectId;
  carId: string;
  model: ModelType;
  stages: ArticleStage[];
  currentStage: "planning" | "drafting" | "polishing";
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean;
  sessionId: string;
}

// Extend Omit<Car, '_id'> to avoid the _id type conflict
interface CarWithId extends Omit<Car, "_id"> {
  _id: ObjectId;
}

async function makeAPIRequest(
  prompt: string,
  model: ModelType,
  systemPrompt: string
) {
  const isClaude = model === "claude-3-5-sonnet-20241022";

  // Estimate tokens and chunk if necessary
  const estimatedPromptTokens = estimateTokens(prompt);
  const maxPromptTokens = isClaude ? 12000 : 4000;
  const maxResponseTokens = isClaude ? 4096 : 1000;
  const maxTotalTokens = isClaude ? 16000 : 5000;

  if (estimatedPromptTokens > maxPromptTokens) {
    console.log(
      `Chunking content: ${estimatedPromptTokens} tokens -> ${maxPromptTokens} max`
    );
    prompt = chunkContent(prompt, maxPromptTokens);
  }

  // Create timeout promise
  const timeoutPromise = new Promise(
    (_, reject) => setTimeout(() => reject(new Error("Request timeout")), 55000) // 55 seconds timeout
  );

  if (isClaude) {
    try {
      const responsePromise = anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: maxResponseTokens,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      // Race between API call and timeout
      const response = (await Promise.race([
        responsePromise,
        timeoutPromise,
      ])) as Awaited<typeof responsePromise>;

      const content = response.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Invalid response format from Claude");
      }

      return content.text;
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        throw error;
      }
      console.error("Anthropic API Error:", error);
      throw error;
    }
  } else {
    try {
      const responsePromise = openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxResponseTokens,
        temperature: 0.7,
      });

      // Race between API call and timeout
      const completion = (await Promise.race([
        responsePromise,
        timeoutPromise,
      ])) as Awaited<typeof responsePromise>;

      return completion.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        throw error;
      }
      console.error("OpenAI API request failed:", error);
      throw error;
    }
  }
}

async function generateArticlePlan(
  car: CarWithId,
  researchContent: string,
  model: ModelType,
  context?: string,
  focus?: string,
  onProgress?: (progress: any) => void
) {
  const sendProgress = onProgress || (() => {});

  sendProgress({
    stage: "planning",
    step: "analyzing",
    message: "Analyzing vehicle data...",
  });

  const prompt = context
    ? `Please revise the article plan based on this feedback: ${context}`
    : `Create a detailed article plan for a ${car.year} ${car.make} ${
        car.model
      }.${
        focus
          ? `\n\nThis article should focus specifically on ${focus}. The outline and content should primarily explore and analyze this aspect of the vehicle, only mentioning other aspects when they directly relate to ${focus}.`
          : ""
      }`;

  sendProgress({
    stage: "planning",
    step: "generating",
    message: "Generating article outline...",
  });

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist creating detailed article plans."
  );

  sendProgress({
    stage: "planning",
    step: "complete",
    message: "Article plan generated",
  });

  return response;
}

async function generateDraft(
  plan: string,
  car: CarWithId,
  researchContent: string,
  model: ModelType,
  context?: string,
  focus?: string,
  onProgress?: (progress: any) => void
) {
  const sendProgress = onProgress || (() => {});

  sendProgress({
    stage: "drafting",
    step: "preparing",
    message: "Preparing draft content...",
  });

  const prompt = context
    ? `Please revise the article draft based on this feedback: ${context}`
    : `Write a comprehensive article draft following this outline:

${plan}

Car Details:
${JSON.stringify(car, null, 2)}

Research Content:
${researchContent}`;

  sendProgress({
    stage: "drafting",
    step: "writing",
    message: "Writing article draft...",
  });

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist writing detailed vehicle articles."
  );

  sendProgress({
    stage: "drafting",
    step: "complete",
    message: "Article draft completed",
  });

  return response;
}

async function polishArticle(
  draft: string,
  model: ModelType,
  onProgress?: (progress: any) => void
) {
  const sendProgress = onProgress || (() => {});

  sendProgress({
    stage: "polishing",
    step: "starting",
    message: "Starting final polish...",
  });

  const prompt = `Please polish and refine this article draft, focusing on:
1. Improving flow and readability
2. Enhancing technical accuracy
3. Adding engaging transitions
4. Ensuring consistent tone
5. Strengthening the introduction and conclusion

Article Draft:
${draft}`;

  sendProgress({
    stage: "polishing",
    step: "refining",
    message: "Refining article...",
  });

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist polishing vehicle articles."
  );

  sendProgress({
    stage: "polishing",
    step: "complete",
    message: "Article polishing completed",
  });

  return response;
}

async function reviseContent(
  existingContent: string,
  revisionContext: string,
  model: ModelType,
  stage: "planning" | "drafting" | "polishing"
) {
  console.log("Revising content:", {
    stage,
    revisionContext,
    contentLength: existingContent.length,
  });

  const stageSpecificInstructions = {
    planning:
      "Focus on restructuring and improving the article outline while maintaining its organizational clarity.",
    drafting:
      "Revise the draft while maintaining its comprehensive coverage and technical accuracy.",
    polishing:
      "Enhance the article's style and flow while preserving its technical precision and professional tone.",
  };

  const revisionPrompt = `Please revise the following ${stage} stage content based on this feedback:

REVISION REQUEST:
${revisionContext}

CURRENT CONTENT:
${existingContent}

INSTRUCTIONS:
${stageSpecificInstructions[stage]}
- Maintain the existing structure while incorporating the requested changes
- Ensure all technical information remains accurate
- Keep the tone consistent with the current stage
- Focus specifically on addressing the feedback provided
- Avoid using dramatic phrases like "wasn't just X - it was Y" or similar constructs
- Use clear, direct language without relying on dramatic contrasts

Please provide the complete revised version.`;

  console.log("Sending revision prompt to LLM", {
    promptLength: revisionPrompt.length,
    stage,
    model,
  });

  const systemPrompt =
    "You are an automotive journalist revising content based on specific feedback. Focus on making targeted improvements while maintaining the overall quality and accuracy.";

  return await callWithRateLimit(
    () => makeAPIRequest(revisionPrompt, model, systemPrompt),
    model
  );
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because the url is /cars/[id]/article

    const db = await getDatabase();

    // First try to find a car_article document
    const article = await db
      .collection("car_articles")
      .findOne({ carId: new ObjectId(id) });

    if (article) {
      return NextResponse.json({
        article: article.content,
        generatedAt: article.generatedAt,
        updatedAt: article.updatedAt,
        model: article.model,
      });
    }

    // If no article found, check if there's an in-progress article state
    const articleState = await db
      .collection("article_states")
      .findOne({ carId: new ObjectId(id) });

    if (articleState) {
      return NextResponse.json({
        stage: articleState.stage,
        outline: articleState.outline,
        workingDraft: articleState.workingDraft,
        currentPoint: articleState.currentPoint,
        lastUpdated: articleState.lastUpdated,
      });
    }

    // Neither article nor state found
    return NextResponse.json(
      { message: "No article found for this car" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error fetching article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch article",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because the url is /cars/[id]/article

    const data = await request.json();
    const { content, model } = data;

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();

    // Save the article
    const result = await db.collection("car_articles").updateOne(
      { carId: new ObjectId(id) },
      {
        $set: {
          content,
          model: model || "manual",
          updatedAt: now,
        },
        $setOnInsert: {
          carId: new ObjectId(id),
          createdAt: now,
          generatedAt: now,
        },
      },
      { upsert: true }
    );

    // Clean up any article states
    await db
      .collection("article_states")
      .deleteOne({ carId: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      updatedAt: now,
      article: content,
    });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save article",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because the url is /cars/[id]/article

    const db = await getDatabase();

    // Delete the article
    const result = await db
      .collection("car_articles")
      .deleteOne({ carId: new ObjectId(id) });

    // Also clean up any article states
    await db
      .collection("article_states")
      .deleteOne({ carId: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "No article found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete article",
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
