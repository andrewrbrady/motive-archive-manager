import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MessageContent {
  type: "text";
  text: string;
}

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

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: temperature || 0.7,
      system: `You are an expert automotive writer specializing in creating engaging Bring a Trailer (BaT) auction listings. Follow these guidelines:

Focus: ${focusGuidelines[focus as keyof typeof focusGuidelines]}
Style: ${styleGuidelines[style as keyof typeof styleGuidelines]}
Tone: ${toneGuidelines[tone as keyof typeof toneGuidelines]}
Length: ${lengthGuidelines[length as keyof typeof lengthGuidelines]}

Writing Guidelines:
- Start with a compelling introduction that hooks potential buyers
- Use proper paragraph breaks for readability
- Include all relevant technical specifications
- Highlight unique features and selling points
- Describe any modifications or restoration work
- Mention maintenance history if provided
- Use precise, accurate terminology
- Avoid subjective terms like "beautiful" or "stunning"
- Focus on factual descriptions and details
- Format numbers consistently (use commas for thousands)
- Include the VIN if provided
- End with a summary of the vehicle's appeal`,
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
- Make the listing engaging and informative for potential buyers`,
        },
      ],
    });

    const content = response.content[0] as MessageContent;
    if (!content.text) {
      throw new Error("Failed to generate listing");
    }

    return NextResponse.json({ listing: content.text.trim() });
  } catch (error) {
    console.error("Error generating BaT listing:", error);
    return NextResponse.json(
      { error: "Failed to generate listing" },
      { status: 500 }
    );
  }
}
