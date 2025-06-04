/**
 * AI-related utility functions
 * Shared between client and server code
 */

// Add model options type
export type AIModel = "gpt-4o-mini" | "gpt-4o" | "gpt-4";

// Add model configuration interface for display purposes
export interface ModelConfig {
  id: AIModel;
  displayName: string;
  description: string;
  defaultTokens: number;
  maxTokens: number;
  enabled: boolean;
}

// Add default model configurations
export const DEFAULT_MODEL_CONFIGS: ModelConfig[] = [
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "Fast and efficient for most tasks",
    defaultTokens: 1000,
    maxTokens: 4000,
    enabled: true,
  },
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    description: "Balanced performance and capabilities",
    defaultTokens: 2000,
    maxTokens: 4000,
    enabled: true,
  },
  {
    id: "gpt-4",
    displayName: "GPT-4",
    description: "Most capable but slower",
    defaultTokens: 2000,
    maxTokens: 4000,
    enabled: true,
  },
];

// Add token validation helper (usable on both client and server)
export function validateTokenRange(tokens: number): number {
  return Math.min(Math.max(tokens, 500), 4000);
}
