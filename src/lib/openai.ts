import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!, // keep server-side
});

// Helper function to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Helper function to get OpenAI client with error handling
export function getOpenAIClient(): OpenAI {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured");
  }
  return openai;
}
