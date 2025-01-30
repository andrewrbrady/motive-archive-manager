import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  BAT_LISTING_EXAMPLES,
  BAT_LISTING_GUIDELINES,
  BAT_LISTING_SECTIONS,
} from "@/constants/bat-listing-examples";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3, // Add retries for reliability
});

interface MessageContent {
  type: "text";
  text: string;
}

export const maxDuration = 60; // Set max duration to 60 seconds (Vercel hobby plan limit)
export const dynamic = "force-dynamic"; // Disable static generation

export async function POST(request: NextRequest) {
  try {
    const {
      carDetails,
      focus,
      style,
      tone,
      length,
      temperature,
      additionalContext,
    } = await request.json();

    if (!carDetails) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Format car specifications
    const specs = [
      `${carDetails.year} ${carDetails.make} ${carDetails.model}`,
      carDetails.color && `Exterior Color: ${carDetails.color}`,
      carDetails.mileage?.value &&
        `Mileage: ${carDetails.mileage.value}${
          carDetails.mileage.unit || "mi"
        }`,
      carDetails.engine?.type && `Engine: ${carDetails.engine.type}`,
      carDetails.engine?.displacement?.value &&
        `Displacement: ${carDetails.engine.displacement.value}${carDetails.engine.displacement.unit}`,
      carDetails.engine?.power?.hp && `Power: ${carDetails.engine.power.hp}hp`,
      carDetails.transmission?.type &&
        `Transmission: ${carDetails.transmission.type}`,
      carDetails.vin && `VIN: ${carDetails.vin}`,
      carDetails.condition && `Condition: ${carDetails.condition}`,
      carDetails.interior_color &&
        `Interior Color: ${carDetails.interior_color}`,
      carDetails.interior_features?.seats &&
        `Seats: ${carDetails.interior_features.seats}`,
      carDetails.interior_features?.upholstery &&
        `Upholstery: ${carDetails.interior_features.upholstery}`,
      carDetails.description && `\nDescription:\n${carDetails.description}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Define focus guidelines
    const focusGuidelines = {
      mechanical:
        "Focus on mechanical details, maintenance history, and technical specifications",
      cosmetic:
        "Emphasize exterior and interior condition, visual details, and aesthetics",
      historical: "Highlight the model's history, significance, and provenance",
      comprehensive:
        "Cover all aspects including mechanical, cosmetic, and historical details",
    };

    // Define style guidelines
    const styleGuidelines = {
      factual: "Present information in a clear, objective manner",
      storytelling:
        "Weave details into a narrative that engages potential buyers",
      technical: "Use precise technical language and detailed specifications",
    };

    // Define tone guidelines
    const toneGuidelines = {
      enthusiastic: "Show excitement and passion for the vehicle",
      professional: "Maintain a formal, business-like tone",
      casual: "Use a relaxed, conversational style",
      formal: "Employ sophisticated, refined language",
    };

    // Define length guidelines
    const lengthGuidelines = {
      concise: "Write a brief listing of 2-3 paragraphs",
      standard: "Create a moderate-length listing of 3-4 paragraphs",
      detailed: "Develop a comprehensive listing of 4-5 paragraphs",
      comprehensive: "Produce an extensive listing of 5+ paragraphs",
    };

    // Set timeout for the API call
    const timeoutPromise = new Promise(
      (_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 55000) // 55 seconds timeout
    );

    // Get a relevant example based on the car type and focus
    const relevantExample =
      BAT_LISTING_EXAMPLES.find((example) => {
        if (
          focus === "mechanical" &&
          example.title === "Modern Performance Car"
        )
          return true;
        if (focus === "historical" && example.title === "Vintage Race Car")
          return true;
        if (focus === "comprehensive" && example.title === "Classic Sports Car")
          return true;
        return false;
      }) || BAT_LISTING_EXAMPLES[0];

    const responsePromise = anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: temperature || 0.7,
      system: `You are an expert automotive writer specializing in creating engaging Bring a Trailer (BaT) auction listings. Follow these guidelines:

Focus: ${focusGuidelines[focus as keyof typeof focusGuidelines]}
Style: ${styleGuidelines[style as keyof typeof styleGuidelines]}
Tone: ${toneGuidelines[tone as keyof typeof toneGuidelines]}
Length: ${lengthGuidelines[length as keyof typeof lengthGuidelines]}

BaT Listing Guidelines:
${BAT_LISTING_GUIDELINES.map((g) => `- ${g}`).join("\n")}

Listing Structure:
${Object.entries(BAT_LISTING_SECTIONS)
  .map(([section, desc]) => `${section}: ${desc}`)
  .join("\n")}

Here's a relevant example of a well-written BaT listing:
${relevantExample.listing}`,
      messages: [
        {
          role: "user",
          content: `Create a BaT auction listing for this vehicle:

Car Specifications:
${specs}

Additional Context:
${additionalContext || "No additional context provided."}

Follow these rules:
- Create a listing that stands out and differs from previous ones
- Avoid generic or overused phrases
- Focus on factual information and specifications
- Maintain the specified tone and style
- Do not make assumptions about the car's history or modifications
- Use proper formatting and paragraph breaks
- Make the listing engaging and informative for potential buyers
- Follow the BaT listing structure and guidelines provided`,
        },
      ],
    });

    // Race between the API call and timeout
    const response = (await Promise.race([
      responsePromise,
      timeoutPromise,
    ])) as Awaited<typeof responsePromise>;

    const content = response.content[0] as MessageContent;
    if (!content.text) {
      throw new Error("Failed to generate listing");
    }

    return NextResponse.json({ listing: content.text.trim() });
  } catch (error) {
    console.error("Error generating BaT listing:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate listing";
    const status = errorMessage === "Request timeout" ? 504 : 500;
    return NextResponse.json({ error: errorMessage }, { status });
  }
}
