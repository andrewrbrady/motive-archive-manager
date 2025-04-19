import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const {
      text,
      context = "",
      prompt,
      temperature = 0.7,
      maxTokens = 1024,
      isCompletion = false,
    } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    // Validate temperature and max tokens
    const validatedTemperature = Math.max(0, Math.min(1, temperature));
    const validatedMaxTokens = Math.max(100, Math.min(4096, maxTokens));

    let userPrompt;

    if (isCompletion) {
      // Format prompt for code completion
      userPrompt = `${prompt.trim()}

IMPORTANT: You are helping a user with MDX document completion. Continue the document from where the user has stopped typing. Your completion should be natural and seamless, matching the style and content of what came before. The completion should provide value and be relevant to the document context.

DO NOT include any commentary, explanations, or phrases like "Here's my completion". Do not add any introductory text. Just provide the completion directly with no preamble. Only provide content that would reasonably follow what the user has already written.

Here is the document so far:

${text}

The current cursor is here. Please continue the document:

${context ? `\nHere's some additional context about what comes after the cursor:\n${context}` : ""}`;
    } else {
      // Format prompt for text enhancement
      userPrompt = `${prompt.trim()}

IMPORTANT: Do not add any commentary, explanations, or phrases like "Here's the revised text". Do not include phrases such as "Here is", "Here you go", or any other introductory text. Just return the enhanced text directly with no preamble. Only return the final result without any explanations.

Here is the text to enhance:

${text}`;
    }

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: validatedMaxTokens,
      temperature: validatedTemperature,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract the text from the response
    let responseText = "";
    if (response.content[0].type === "text") {
      responseText = response.content[0].text;
    }

    if (isCompletion) {
      return NextResponse.json({ completion: responseText });
    } else {
      return NextResponse.json({ enhancedText: responseText });
    }
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    return NextResponse.json(
      { error: "Failed to process text with Anthropic API" },
      { status: 500 }
    );
  }
}
