import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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
  focus?: string
) {
  const prompt = context
    ? `Please revise the article plan based on this feedback: ${context}`
    : `Create a detailed article plan for a ${car.year} ${car.make} ${
        car.model
      }.${
        focus
          ? `\n\nThis article should focus specifically on ${focus}. The outline and content should primarily explore and analyze this aspect of the vehicle, only mentioning other aspects when they directly relate to ${focus}.`
          : ""
      }
    
Car Details:
${JSON.stringify(car, null, 2)}

${
  focus
    ? `Please create a focused outline that thoroughly explores ${focus}:
1. Introduction
   - Brief overview of the vehicle
   - Why ${focus} is significant for this model
2. Historical Context of ${focus}
   - Evolution and development
   - Key influences and inspirations
3. Detailed Analysis of ${focus}
   - Key features and characteristics
   - Technical aspects related to ${focus}
4. Impact and Significance
   - How ${focus} defines the vehicle
   - Comparison with contemporaries
5. Conclusion
   - Legacy and influence of ${focus}

For each section, provide 3-4 key points that specifically relate to ${focus}.`
    : `Please create a comprehensive outline that covers:
1. Introduction and overview
2. Historical context and significance
3. Design and exterior features
4. Interior and comfort
5. Engine and performance
6. Driving experience and handling
7. Technology and features
8. Market position and value
9. Conclusion

For each section, provide 3-4 key points to be covered.`
}`;

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist creating detailed article plans."
  );
  return response;
}

async function generateDraft(
  plan: string,
  car: any,
  researchContent: string,
  model: ModelType,
  context?: string,
  focus?: string
) {
  const prompt = context
    ? `Please revise the article draft based on this feedback: ${context}`
    : `Write a comprehensive article draft following this outline:

${plan}

Car Details:
${JSON.stringify(car, null, 2)}

Research Content:
${researchContent}

${
  focus
    ? `Remember to maintain focus on ${focus} throughout the article. Only discuss other aspects of the vehicle when they directly relate to or influence ${focus}.`
    : "Create a well-balanced article that covers all aspects outlined above."
}

Please write in a professional, journalistic style with clear section headings and engaging prose.`;

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist writing detailed vehicle articles."
  );
  return response;
}

async function polishArticle(
  draft: string,
  model: ModelType,
  context?: string
) {
  const prompt = context
    ? `Please revise the article based on this feedback: ${context}`
    : `Polish and enhance this article draft to create the final version:

${draft}

Focus on:
1. Improving flow and transitions
2. Enhancing language and style
3. Ensuring technical accuracy
4. Adding engaging hooks and conclusions
5. Maintaining consistent tone
6. Optimizing readability`;

  const response = await makeAPIRequest(
    prompt,
    model,
    "You are a professional automotive journalist polishing articles to their final form."
  );
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { model, stage, context, focus } = await request.json();
    const carId = params.id;

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get car details
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get existing article metadata
    let metadata = await db.collection("article_metadata").findOne({ carId });

    // Initialize metadata if it doesn't exist
    if (!metadata) {
      metadata = {
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
      // Generate new content
      switch (stage) {
        case "planning":
          content = await generateArticlePlan(car, "", model, undefined, focus);
          break;
        case "drafting":
          const plan = metadata.stages.find(
            (s) => s.stage === "planning"
          )?.content;
          if (!plan) throw new Error("No planning stage found");
          content = await generateDraft(plan, car, "", model, undefined, focus);
          break;
        case "polishing":
          const draft = metadata.stages.find(
            (s) => s.stage === "drafting"
          )?.content;
          if (!draft) throw new Error("No draft stage found");
          content = await polishArticle(draft, model);
          break;
        default:
          throw new Error("Invalid stage");
      }
    } else {
      // Handle revision
      const currentContent = metadata.stages.find(
        (s) => s.stage === stage
      )?.content;
      if (!currentContent) throw new Error("No content found for revision");
      content = await reviseContent(currentContent, context, model, stage);
    }

    if (!content) {
      throw new Error("Failed to generate content");
    }

    // Update the stages array with the new content
    const stageIndex = metadata.stages.findIndex((s) => s.stage === stage);
    if (stageIndex >= 0) {
      metadata.stages[stageIndex] = {
        stage,
        content,
        timestamp: new Date(),
      };
    } else {
      metadata.stages.push({
        stage,
        content,
        timestamp: new Date(),
      });
    }

    // Update metadata
    metadata.currentStage = stage;
    metadata.updatedAt = new Date();
    metadata.isComplete = stage === "polishing";

    // Save metadata to database
    await db
      .collection("article_metadata")
      .updateOne({ carId }, { $set: metadata }, { upsert: true });

    console.log("Returning metadata:", {
      currentStage: metadata.currentStage,
      stagesCount: metadata.stages.length,
      hasContent: metadata.stages.some((s) => s.stage === stage),
    });

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error("Error in article generation:", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 }
    );
  }
}
