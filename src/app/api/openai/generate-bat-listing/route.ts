import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
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

    const systemPrompt = `You are an expert automotive writer specializing in creating detailed listings for Bring a Trailer (BaT), a premium auction platform for special interest vehicles. Your task is to create a comprehensive, engaging, and technically accurate listing that follows BaT's style and format.

Key aspects of BaT listings:
- Detailed technical specifications and history
- Clear documentation of modifications and maintenance
- Professional yet engaging tone
- Organized structure with clear sections
- Focus on unique features and selling points
- Honest description of condition, including any flaws
- Appropriate use of automotive terminology

Writing Guidelines:
- Focus: ${focus} - ${
      focus === "mechanical"
        ? "Emphasize mechanical details and specifications"
        : focus === "cosmetic"
        ? "Focus on visual aspects and condition"
        : focus === "historical"
        ? "Highlight historical significance and provenance"
        : "Cover all aspects comprehensively"
    }
- Style: ${style} - ${
      style === "factual"
        ? "Present information in a straightforward, data-driven manner"
        : style === "storytelling"
        ? "Weave details into an engaging narrative"
        : "Provide in-depth technical analysis and specifications"
    }
- Tone: ${tone} - ${
      tone === "enthusiastic"
        ? "Show excitement and passion for the vehicle"
        : tone === "professional"
        ? "Maintain a polished, business-like tone"
        : tone === "casual"
        ? "Use a more relaxed, approachable voice"
        : "Employ formal, authoritative language"
    }
- Length: ${length} - ${
      length === "concise"
        ? "Keep the listing brief but informative"
        : length === "standard"
        ? "Provide a balanced amount of detail"
        : length === "detailed"
        ? "Include comprehensive information"
        : "Cover every aspect in extensive detail"
    }`;

    const userPrompt = `Please write a Bring a Trailer listing for this vehicle:

Year: ${carDetails.year}
Make: ${carDetails.make}
Model: ${carDetails.model}
Color: ${carDetails.color || "Not specified"}
Mileage: ${
      carDetails.mileage
        ? `${carDetails.mileage.value} ${carDetails.mileage.unit}`
        : "Not specified"
    }
Engine: ${carDetails.engine?.type || "Not specified"}
Engine Displacement: ${
      carDetails.engine?.displacement
        ? `${carDetails.engine.displacement.value} ${carDetails.engine.displacement.unit}`
        : "Not specified"
    }
Horsepower: ${carDetails.engine?.power?.hp || "Not specified"}
Transmission: ${carDetails.transmission?.type || "Not specified"}
VIN: ${carDetails.vin || "Not specified"}
Condition: ${carDetails.condition || "Not specified"}
Interior Color: ${carDetails.interior_color || "Not specified"}
Interior Features: ${
      carDetails.interior_features
        ? `${carDetails.interior_features.seats} seats, ${
            carDetails.interior_features.upholstery ||
            "upholstery not specified"
          }`
        : "Not specified"
    }

Additional Context:
${additionalContext || "None provided"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: temperature,
      max_tokens:
        length === "comprehensive"
          ? 3000
          : length === "detailed"
          ? 2500
          : length === "standard"
          ? 2000
          : 1500,
    });

    const listing = completion.choices[0].message.content;

    return NextResponse.json({ listing });
  } catch (error) {
    console.error("Error generating BaT listing:", error);
    return NextResponse.json(
      { error: "Failed to generate listing" },
      { status: 500 }
    );
  }
}
