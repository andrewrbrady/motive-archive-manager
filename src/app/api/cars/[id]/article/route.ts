import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { RateLimiter } from "limiter";
import type { ModelType } from "@/types/models";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getApiUrl } from "@/lib/utils";
import { Car } from "@/types/car";

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
  car: Car & { _id: ObjectId },
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
  car: any,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { model, stage, context, focus } = await request.json();
    const carId = params.id;

    // Initialize database connection first, outside of the streaming context
    const { db } = await connectToDatabase();
    console.log("[DEBUG] MongoDB Connection established");

    // Fetch and initialize car data before setting up the stream
    console.log("[DEBUG] GET - Fetching car with ID:", carId);
    const rawCar = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!rawCar) {
      console.log("[DEBUG] Car not found:", carId);
      throw new Error(`Car not found with ID: ${carId}`);
    }

    // Initialize the car with clientInfo upfront
    console.log("[DEBUG] Raw car data:", {
      _id: rawCar._id.toString(),
      hasClientInfo: "clientInfo" in rawCar,
      keys: Object.keys(rawCar),
    });

    const car = {
      ...rawCar,
      _id: rawCar._id,
      clientInfo: rawCar.clientInfo || {
        _id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
      },
    } as Car & { _id: ObjectId };

    // Ensure proper serialization of ObjectId in logs
    const serializedCar = {
      _id: car._id.toString(),
      clientInfo: car.clientInfo,
      keys: Object.keys(car),
    };

    console.log("[DEBUG] GET - Initial car data:", serializedCar);

    // Fetch client info if it exists
    if (car.client) {
      console.log(
        "[DEBUG] GET - Fetching client info for car",
        carId,
        "client ID:",
        car.client
      );

      try {
        const clientId = new ObjectId(car.client);
        const clientInfo = await db
          .collection("clients")
          .findOne({ _id: clientId });

        if (clientInfo) {
          console.log("[DEBUG] GET - Found client document:", {
            _id: clientInfo._id.toString(),
            name: clientInfo.name,
            hasEmail: !!clientInfo.email,
            hasPhone: !!clientInfo.phone,
          });

          car.clientInfo = {
            _id: clientInfo._id.toString(),
            name: clientInfo.name || "",
            email: clientInfo.email || "",
            phone: clientInfo.phone || "",
            address: clientInfo.address || "",
          };

          console.log(
            "[DEBUG] GET - Updated car with client info:",
            car.clientInfo
          );
        } else {
          console.warn("[WARN] Client not found for ID:", car.client);
        }
      } catch (error) {
        console.error("[ERROR] Error fetching client info:", error);
      }
    }

    // Create EventSource response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendProgress = async (progress: any) => {
      const event = {
        type: "progress",
        ...progress,
      };
      await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Start SSE response
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    // Process in background with the already initialized car
    (async () => {
      try {
        let metadata = await db
          .collection("article_metadata")
          .findOne({ carId });

        if (!metadata) {
          metadata = {
            _id: new ObjectId(),
            carId,
            model,
            stages: [],
            currentStage: stage,
            createdAt: new Date(),
            updatedAt: new Date(),
            isComplete: false,
            sessionId: new ObjectId().toString(),
          };
        }

        let content;

        if (!context) {
          switch (stage) {
            case "planning":
              content = await generateArticlePlan(
                car,
                "",
                model,
                undefined,
                focus,
                sendProgress
              );
              break;
            case "drafting":
              const plan = metadata.stages.find(
                (s) => s.stage === "planning"
              )?.content;
              if (!plan) throw new Error("No planning stage found");
              content = await generateDraft(
                plan,
                car,
                "",
                model,
                undefined,
                focus,
                sendProgress
              );
              break;
            case "polishing":
              const draft = metadata.stages.find(
                (s) => s.stage === "drafting"
              )?.content;
              if (!draft) throw new Error("No draft stage found");
              content = await polishArticle(draft, model, sendProgress);
              break;
            default:
              throw new Error("Invalid stage");
          }
        } else {
          await sendProgress({
            stage,
            step: "revision",
            message: "Processing revision request...",
          });
          const currentContent = metadata.stages.find(
            (s) => s.stage === stage
          )?.content;
          if (!currentContent) throw new Error("No content found for revision");
          content = await reviseContent(currentContent, context, model, stage);
          await sendProgress({
            stage,
            step: "revision-complete",
            message: "Revision completed",
          });
        }

        if (!content) {
          throw new Error("Failed to generate content");
        }

        // Update metadata
        const stageIndex = metadata.stages.findIndex((s) => s.stage === stage);
        if (stageIndex >= 0) {
          metadata.stages[stageIndex] = {
            stage,
            content,
            timestamp: new Date(),
          };
        } else {
          metadata.stages.push({ stage, content, timestamp: new Date() });
        }

        metadata.currentStage = stage;
        metadata.updatedAt = new Date();
        metadata.isComplete = stage === "polishing";

        await db
          .collection("article_metadata")
          .updateOne({ carId }, { $set: metadata }, { upsert: true });

        await sendProgress({
          type: "complete",
          metadata,
          message: `${stage} stage completed successfully`,
        });
      } catch (error) {
        console.error("Error in article generation:", error);
        await sendProgress({
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to generate article",
        });
      } finally {
        await writer.close();
      }
    })();

    return response;
  } catch (error) {
    console.error("Error in article generation:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate article";
    const status = errorMessage === "Request timeout" ? 504 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
