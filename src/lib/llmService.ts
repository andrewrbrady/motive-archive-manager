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

// Initialize provider clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 50000, // 50 second timeout
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 50000, // 50 second timeout
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
      setTimeout(() => reject(new Error("Anthropic API timeout")), 45000)
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
      setTimeout(() => reject(new Error("OpenAI API timeout")), 45000)
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
