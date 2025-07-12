import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  LLMModel,
  LLMProvider,
  ProviderId,
  ProviderParams,
  findModelById,
} from "./llmProviders";

// Base request type for LLM generation
export interface GenerationRequest {
  modelId: string;
  prompt: string;
  systemPrompt?: string;
  params?: ProviderParams;
  format?: "text" | "json";
  stream?: boolean; // Add streaming support
}

// Response from LLM generation
export interface GenerationResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  provider: ProviderId;
  model: string;
}

// Streaming response type
export interface StreamingResponse {
  stream: ReadableStream<string>;
  provider: ProviderId;
  model: string;
}

// Initialize provider clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 280000, // 280 second timeout (4.67 minutes)
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 280000, // 280 second timeout (4.67 minutes)
});

/**
 * Main LLM generation service that routes requests to the appropriate provider
 */
export async function generateText(
  request: GenerationRequest
): Promise<GenerationResponse> {
  const { modelId, prompt, systemPrompt = "", params = {} } = request;

  // Find the model and provider information
  const modelInfo = findModelById(modelId);
  if (!modelInfo) {
    throw new Error(`Model ${modelId} not found`);
  }

  const { model, provider } = modelInfo;

  // Route to the appropriate provider handler
  switch (provider.id) {
    case "anthropic":
      return handleAnthropicRequest(model, prompt, systemPrompt, params);
    case "openai":
      return handleOpenAIRequest(model, prompt, systemPrompt, params);
    default:
      // provider.id should be 'never' here if all cases are handled.
      // If an error is thrown, it means llmProviders has an ID not in ProviderId union.
      throw new Error(
        `Unsupported provider ID: ${provider.id} encountered in llmService.`
      );
  }
}

/**
 * Streaming LLM generation service
 */
export async function generateTextStream(
  request: GenerationRequest
): Promise<StreamingResponse> {
  const { modelId, prompt, systemPrompt = "", params = {} } = request;

  // Find the model and provider information
  const modelInfo = findModelById(modelId);
  if (!modelInfo) {
    throw new Error(`Model ${modelId} not found`);
  }

  const { model, provider } = modelInfo;

  // Route to the appropriate provider streaming handler
  switch (provider.id) {
    case "anthropic":
      return handleAnthropicStreamRequest(model, prompt, systemPrompt, params);
    case "openai":
      return handleOpenAIStreamRequest(model, prompt, systemPrompt, params);
    default:
      throw new Error(`Streaming not supported for provider: ${provider.id}`);
  }
}

/**
 * Handle requests to Anthropic Claude models
 */
async function handleAnthropicRequest(
  model: LLMModel,
  prompt: string,
  systemPrompt: string,
  params: ProviderParams
): Promise<GenerationResponse> {
  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Anthropic API timeout")), 270000)
    );

    // Create the API request promise
    const requestPromise = anthropic.messages.create({
      model: model.id,
      max_tokens: params.maxTokens || model.maxTokens,
      temperature: params.temperature || model.defaultTemperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    // Race between the request and timeout
    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;

    const content = response.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Failed to generate text");
    }

    return {
      text: content.text,
      usage: {
        promptTokens: response.usage?.input_tokens,
        completionTokens: response.usage?.output_tokens,
        totalTokens:
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0),
      },
      provider: "anthropic",
      model: model.id,
    };
  } catch (error) {
    console.error("Anthropic API error:", error);

    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error(
        "Anthropic API request timed out. Please try again with a shorter prompt or different model."
      );
    }

    throw new Error(
      `Anthropic API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle requests to OpenAI models
 */
async function handleOpenAIRequest(
  model: LLMModel,
  prompt: string,
  systemPrompt: string,
  params: ProviderParams
): Promise<GenerationResponse> {
  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("OpenAI API timeout")), 270000)
    );

    // Create the API request promise
    const requestPromise = openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature || model.defaultTemperature,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stop: params.stopSequences,
    });

    // Race between the request and timeout
    const response = (await Promise.race([
      requestPromise,
      timeoutPromise,
    ])) as any;

    return {
      text: response.choices[0]?.message?.content || "",
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
      provider: "openai",
      model: model.id,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);

    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes("timeout")) {
      throw new Error(
        "OpenAI API request timed out. Please try again with a shorter prompt or different model."
      );
    }

    throw new Error(
      `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle streaming requests to OpenAI models
 */
async function handleOpenAIStreamRequest(
  model: LLMModel,
  prompt: string,
  systemPrompt: string,
  params: ProviderParams
): Promise<StreamingResponse> {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎬 Starting OpenAI stream for model:", model.id);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📏 Prompt length:", prompt.length);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎛️ Max tokens:", params.maxTokens);

    const stream = await openai.chat.completions.create({
      model: model.id,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature || model.defaultTemperature,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      stop: params.stopSequences,
      stream: true,
    });

    // Create a readable stream that processes the OpenAI stream
    const readableStream = new ReadableStream<string>({
      async start(controller) {
        let chunkCount = 0;
        let totalContent = "";

        try {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📡 OpenAI stream started, processing chunks...");

          for await (const chunk of stream) {
            chunkCount++;
            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              totalContent += content;
              controller.enqueue(content);

              // Log progress every 20 chunks to reduce noise
              if (chunkCount % 20 === 0) {
                console.log(
                  `📤 Chunk ${chunkCount}: +${content.length} chars (total: ${totalContent.length})`
                );
              }
            }

            // Check for finish reason - this is critical for proper completion
            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason) {
              console.log(
                "🏁 OpenAI stream finished:",
                finishReason,
                `after ${chunkCount} chunks`
              );
              break;
            }
          }

          console.log(
            `✅ OpenAI stream complete: ${chunkCount} chunks, ${totalContent.length} total characters`
          );
          controller.close();
        } catch (error) {
          console.error("❌ OpenAI stream error:", error);
          controller.error(error);
        }
      },
    });

    return {
      stream: readableStream,
      provider: "openai",
      model: model.id,
    };
  } catch (error) {
    console.error("OpenAI streaming error:", error);
    throw new Error(
      `OpenAI streaming error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Handle streaming requests to Anthropic Claude models
 */
async function handleAnthropicStreamRequest(
  model: LLMModel,
  prompt: string,
  systemPrompt: string,
  params: ProviderParams
): Promise<StreamingResponse> {
  try {
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎬 Starting Anthropic stream for model:", model.id);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📏 Prompt length:", prompt.length);
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🎛️ Max tokens:", params.maxTokens);

    const stream = await anthropic.messages.create({
      model: model.id,
      max_tokens: params.maxTokens || model.maxTokens,
      temperature: params.temperature || model.defaultTemperature,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    // Create a readable stream that processes the Anthropic stream
    const readableStream = new ReadableStream<string>({
      async start(controller) {
        let chunkCount = 0;
        let totalContent = "";

        try {
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📡 Anthropic stream started, processing chunks...");

          for await (const chunk of stream) {
            chunkCount++;

            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const content = chunk.delta.text;
              totalContent += content;
              controller.enqueue(content);

              // Log progress every 10 chunks
              if (chunkCount % 10 === 0) {
                console.log(
                  `📤 Chunk ${chunkCount}: +${content.length} chars (total: ${totalContent.length})`
                );
              }
            } else if (chunk.type === "message_stop") {
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🏁 Anthropic stream finished: message_stop");
              break;
            }
          }

          console.log(
            `✅ Anthropic stream complete: ${chunkCount} chunks, ${totalContent.length} total characters`
          );
          controller.close();
        } catch (error) {
          console.error("❌ Anthropic stream error:", error);
          controller.error(error);
        }
      },
    });

    return {
      stream: readableStream,
      provider: "anthropic",
      model: model.id,
    };
  } catch (error) {
    console.error("Anthropic streaming error:", error);
    throw new Error(
      `Anthropic streaming error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
