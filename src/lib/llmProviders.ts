import { z } from "zod";

// Basic LLM provider interface
export interface LLMProvider {
  id: string;
  name: string;
  models: LLMModel[];
  apiKey?: string;
  baseUrl?: string;
}

// Model information interface
export interface LLMModel {
  id: string;
  name: string;
  maxTokens: number;
  supportedFeatures: string[];
  contextWindow: number;
  defaultTemperature: number;
  costPer1KTokens?: number;
  apiParams?: Record<string, any>;
}

// Provider-specific parameters
export interface ProviderParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  [key: string]: any;
}

// Define the available provider IDs
export type ProviderId = "anthropic" | "openai";

// Providers & models (updated May 2025, retaining legacy options)
export const llmProviders: Record<ProviderId, LLMProvider> = {
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: [
      {
        id: "claude-3-7-sonnet-20250219",
        name: "Claude 3.7 Sonnet",
        maxTokens: 200_000,
        contextWindow: 200_000,
        defaultTemperature: 1.0,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.003, // $3 / M input
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        maxTokens: 200_000,
        contextWindow: 200_000,
        defaultTemperature: 1.0,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.003, // $3 / M input
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    models: [
      {
        id: "gpt-4.1",
        name: "GPT‑4.1",
        maxTokens: 1_000_000,
        contextWindow: 1_000_000,
        defaultTemperature: 0.7,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.002, // $2 / M input
      },
      {
        id: "gpt-4.1-mini",
        name: "GPT‑4.1 Mini",
        maxTokens: 1_000_000,
        contextWindow: 1_000_000,
        defaultTemperature: 0.7,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.0004, // $0.40 / M input
      },
      {
        id: "gpt-4o",
        name: "GPT‑4o",
        maxTokens: 128_000,
        contextWindow: 128_000,
        defaultTemperature: 0.7,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.005, // $5 / M input
      },
      {
        id: "gpt-4o-mini",
        name: "GPT‑4o Mini",
        maxTokens: 128_000,
        contextWindow: 128_000,
        defaultTemperature: 0.7,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.00015, // $0.15 / M input
      },
      {
        id: "gpt-4.5-preview-2025-02-27",
        name: "GPT‑4.5 Preview",
        maxTokens: 128_000,
        contextWindow: 128_000,
        defaultTemperature: 0.7,
        supportedFeatures: ["text", "vision", "json-mode"],
        costPer1KTokens: 0.005, // $5 / M input
      },
    ],
  },
};

// Helper to get all available models as a flat array
export const getAllModels = (): {
  model: LLMModel;
  provider: LLMProvider;
}[] =>
  Object.values(llmProviders).flatMap((provider) =>
    provider.models.map((model) => ({ model, provider }))
  );

// Helper to find a model by its ID
export const findModelById = (
  modelId: string
): { model: LLMModel; provider: LLMProvider } | undefined => {
  for (const providerId in llmProviders) {
    const provider = llmProviders[providerId as ProviderId];
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return { model, provider };
  }
  return undefined;
};

// Validation schema for generation parameters
export const generationParamsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(1_000_000).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
});

export type GenerationParams = z.infer<typeof generationParamsSchema>;
