import { NextResponse } from "next/server";
import { RateLimiter } from "limiter";
import type { ModelType } from "@/types/models";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Add these utility functions at the top level
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function chunkContent(content: string, maxTokens: number = 20000): string {
  const paragraphs = content.split("\n\n");
  let currentChunk = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);
    if (currentTokens + paragraphTokens > maxTokens) {
      break;
    }
    currentChunk += paragraph + "\n\n";
    currentTokens += paragraphTokens;
  }

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
  const maxPromptTokens = isClaude ? 12000 : 20000; // Reduced for Claude
  const maxResponseTokens = isClaude ? 4096 : 12000; // Reduced for Claude

  if (estimatedPromptTokens > maxPromptTokens) {
    console.log(
      `Chunking content: ${estimatedPromptTokens} tokens -> ${maxPromptTokens} max`
    );
    prompt = chunkContent(prompt, maxPromptTokens);
  }

  if (isClaude) {
    try {
      const response = await anthropic.messages.create({
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

      const content = response.content[0];
      if (!content || content.type !== "text") {
        throw new Error("Invalid response format from Claude");
      }

      return content.text;
    } catch (error) {
      console.error("Anthropic API Error:", error);
      throw error;
    }
  } else {
    // OpenAI request handling
    const apiConfig = {
      url: process.env.OPENAI_API_ENDPOINT!,
      key: process.env.OPENAI_API_KEY!,
    };

    if (!apiConfig.key) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    const baseUrl = apiConfig.url.endsWith("/")
      ? apiConfig.url.slice(0, -1)
      : apiConfig.url;

    const requestBody = {
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
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiConfig.key}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("OpenAI API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      throw new Error(
        `API request failed: ${response.statusText}${
          errorData?.error?.message ? ` - ${errorData.error.message}` : ""
        }`
      );
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

async function generateArticlePlan(
  car: any,
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

export const runtime = "edge";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { model, stage, context, focus } = await request.json();
    const carId = params.id;

    // Create EventSource response with proper headers for Vercel
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Fetch car data from MongoDB Data API
          const carResponse = await fetch(
            `${process.env.MONGODB_DATA_API_URL}/action/findOne`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": process.env.MONGODB_DATA_API_KEY!,
              },
              body: JSON.stringify({
                dataSource: process.env.MONGODB_DATA_SOURCE,
                database: process.env.MONGODB_DATABASE,
                collection: "cars",
                filter: { _id: { $oid: carId } },
              }),
            }
          );

          if (!carResponse.ok) {
            throw new Error("Failed to fetch car data");
          }

          const carData = await carResponse.json();
          const car = carData.document;

          if (!car) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error: "Car not found",
                })}\n\n`
              )
            );
            controller.close();
            return;
          }

          // Fetch metadata from MongoDB Data API
          const metadataResponse = await fetch(
            `${process.env.MONGODB_DATA_API_URL}/action/findOne`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": process.env.MONGODB_DATA_API_KEY!,
              },
              body: JSON.stringify({
                dataSource: process.env.MONGODB_DATA_SOURCE,
                database: process.env.MONGODB_DATABASE,
                collection: "article_metadata",
                filter: { carId },
              }),
            }
          );

          if (!metadataResponse.ok) {
            throw new Error("Failed to fetch metadata");
          }

          const metadataData = await metadataResponse.json();
          let metadata = metadataData.document;

          if (!metadata) {
            metadata = {
              carId,
              model,
              stages: [],
              currentStage: stage,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isComplete: false,
              sessionId: crypto.randomUUID(),
            };
          }

          const sendProgress = async (progress: any) => {
            const event = {
              type: "progress",
              ...progress,
            };
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
            );
          };

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
                  (s: any) => s.stage === "planning"
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
                  (s: any) => s.stage === "drafting"
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
              (s: any) => s.stage === stage
            )?.content;
            if (!currentContent)
              throw new Error("No content found for revision");
            content = await reviseContent(
              currentContent,
              context,
              model,
              stage
            );
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
          const stageIndex = metadata.stages.findIndex(
            (s: any) => s.stage === stage
          );
          if (stageIndex >= 0) {
            metadata.stages[stageIndex] = {
              stage,
              content,
              timestamp: new Date().toISOString(),
            };
          } else {
            metadata.stages.push({
              stage,
              content,
              timestamp: new Date().toISOString(),
            });
          }

          metadata.currentStage = stage;
          metadata.updatedAt = new Date().toISOString();
          metadata.isComplete = stage === "polishing";

          // Update metadata in MongoDB using Data API
          const updateResponse = await fetch(
            `${process.env.MONGODB_DATA_API_URL}/action/updateOne`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "api-key": process.env.MONGODB_DATA_API_KEY!,
              },
              body: JSON.stringify({
                dataSource: process.env.MONGODB_DATA_SOURCE,
                database: process.env.MONGODB_DATABASE,
                collection: "article_metadata",
                filter: { carId },
                update: { $set: metadata },
                upsert: true,
              }),
            }
          );

          if (!updateResponse.ok) {
            throw new Error("Failed to update metadata");
          }

          // Send completion event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "complete",
                metadata,
                message: `${stage} stage completed successfully`,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error("Error in article generation:", error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                type: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Failed to generate article",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in article generation:", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 }
    );
  }
}
