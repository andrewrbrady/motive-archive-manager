import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { CAPTION_GUIDELINES } from "@/constants/caption-examples";

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
      platform,
      context,
      carDetails,
      temperature,
      tone,
      style,
      length,
      template,
    } = await request.json();

    if (!platform || !carDetails) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Format car specifications for generation only
    const specs = [
      `${carDetails.year} ${carDetails.make} ${carDetails.model}`,
      carDetails.type && `Type: ${carDetails.type}`,
      carDetails.color && `Color: ${carDetails.color}`,
      carDetails.mileage?.value &&
        `Mileage: ${carDetails.mileage.value}${
          carDetails.mileage.unit || "mi"
        }`,
      carDetails.engine?.type && `Engine: ${carDetails.engine.type}`,
      carDetails.engine?.displacement?.value &&
        `Displacement: ${carDetails.engine.displacement.value}${carDetails.engine.displacement.unit}`,
      carDetails.engine?.power?.hp &&
        `Power: ${carDetails.engine.power.hp}hp / ${carDetails.engine.power.kW}kW`,
      carDetails.engine?.torque?.["lb-ft"] &&
        `Torque: ${carDetails.engine.torque["lb-ft"]}lb-ft / ${carDetails.engine.torque.Nm}Nm`,
    ]
      .filter(Boolean)
      .join("\n");

    // Get platform-specific guidelines
    const guidelines =
      CAPTION_GUIDELINES[platform as keyof typeof CAPTION_GUIDELINES];

    // Define length guidelines
    const lengthGuidelines = {
      concise: "Keep the caption very brief, 1-2 lines maximum.",
      standard: "Write a standard length caption of 2-3 lines.",
      detailed:
        "Create a detailed caption of 3-4 lines, including more specifications.",
      comprehensive:
        "Write a comprehensive caption of 4+ lines with extensive details.",
    };

    // Define tone guidelines
    const toneGuidelines = {
      professional: "Maintain a formal, business-like tone",
      casual: "Use a relaxed, conversational tone",
      enthusiastic: "Express excitement and passion about the vehicle",
      technical: "Focus on technical specifications and engineering details",
    };

    // Define style guidelines
    const styleGuidelines = {
      descriptive:
        "Paint a vivid picture of the vehicle's appearance and features",
      minimal: "Focus on essential information with minimal elaboration",
      storytelling: "Weave the car's features into a compelling narrative",
    };

    // If this is a question template, use different instructions
    if (template === "question") {
      // Generate a caption that will lead into the provided question
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        temperature: temperature || 1.0,
        system: `You are a professional automotive content creator who specializes in writing engaging ${platform} captions. Follow these guidelines:

${guidelines.map((g) => `- ${g}`).join("\n")}

Length Guideline: ${
          lengthGuidelines[length as keyof typeof lengthGuidelines] ||
          lengthGuidelines.standard
        }
Tone Guideline: ${
          toneGuidelines[tone as keyof typeof toneGuidelines] ||
          toneGuidelines.professional
        }
Style Guideline: ${
          styleGuidelines[style as keyof typeof styleGuidelines] ||
          styleGuidelines.descriptive
        }

The first line of every caption must follow this format:
[YEAR] [MAKE] [MODEL] ⚡️ | [DESCRIPTIVE TITLE IN ALL CAPS]
Example: 1967 Ferrari 275 GTB/4 ⚡️ | PININFARINA PERFECTION

Important: End the caption with relevant hashtags on a new line.`,
        messages: [
          {
            role: "user",
            content: `Create a caption for this car that will lead into this specific question: ${context}

Car Specifications:
${specs}

Follow these rules:
- Start with the title line in the specified format
- Create a caption that stands out and differs from previous ones
- Avoid generic or overused phrases
- Do not use subjective terms like "beautiful", "stunning", "gorgeous"
- Focus on factual information and specifications
- Maintain the specified tone and style
- Do not mention price unless specifically provided
- Do not make assumptions about the car's history or modifications
- Do not include the question - it will be added separately
- Use proper formatting based on the platform
- Make the title descriptive and impactful, focusing on a key feature or characteristic
- End with relevant hashtags on a new line`,
          },
        ],
      });

      const captionContent = response.content[0];
      if (!captionContent || captionContent.type !== "text") {
        throw new Error("Failed to generate caption");
      }

      // Find the last occurrence of hashtags
      const captionText = captionContent.text.trim();
      const hashtagIndex = captionText.lastIndexOf("\n#");

      // Split content and hashtags
      const mainContent =
        hashtagIndex !== -1
          ? captionText.slice(0, hashtagIndex).trim()
          : captionText;
      const hashtags =
        hashtagIndex !== -1 ? captionText.slice(hashtagIndex).trim() : "";

      // Combine the caption with the existing question and hashtags
      const combinedCaption = `${mainContent}\n\n${context
        .replace(/^["']|["']$/g, "")
        .trim()}${hashtags ? `\n\n${hashtags}` : ""}`;

      // Return only the caption text
      return NextResponse.json({ caption: combinedCaption });
    }

    // Regular caption generation (including dealer template)
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 500,
      temperature: temperature || 1.0,
      system: `You are a professional automotive content creator who specializes in writing engaging ${platform} captions. Follow these guidelines:

${guidelines.map((g) => `- ${g}`).join("\n")}

Length Guideline: ${
        lengthGuidelines[length as keyof typeof lengthGuidelines] ||
        lengthGuidelines.standard
      }
Tone Guideline: ${
        toneGuidelines[tone as keyof typeof toneGuidelines] ||
        toneGuidelines.professional
      }
Style Guideline: ${
        styleGuidelines[style as keyof typeof styleGuidelines] ||
        styleGuidelines.descriptive
      }

The first line of every caption must follow this format:
[YEAR] [MAKE] [MODEL] ⚡️ | [DESCRIPTIVE TITLE IN ALL CAPS]
Example: 1967 Ferrari 275 GTB/4 ⚡️ | PININFARINA PERFECTION

Important: End the caption with relevant hashtags on a new line.`,
      messages: [
        {
          role: "user",
          content: `Create a caption for this car${
            template === "dealer"
              ? " that will lead into a dealer reference"
              : ""
          }:

Car Specifications:
${specs}

Follow these rules:
- Start with the title line in the specified format
- Create a caption that stands out and differs from previous ones
- Avoid generic or overused phrases
- Do not use subjective terms like "beautiful", "stunning", "gorgeous"
- Focus on factual information and specifications
- Maintain the specified tone and style
- Do not mention price unless specifically provided
- Do not make assumptions about the car's history or modifications
${
  template === "dealer"
    ? "- Do not include the dealer reference - it will be added separately"
    : ""
}
- Use proper formatting based on the platform
- Make the title descriptive and impactful, focusing on a key feature or characteristic
- End with relevant hashtags on a new line`,
        },
      ],
    });

    const content = response.content[0] as MessageContent;
    if (!content.text) {
      throw new Error("Failed to generate caption");
    }

    // Find the last occurrence of hashtags
    const captionText = content.text.trim();
    const hashtagIndex = captionText.lastIndexOf("\n#");

    // Split content and hashtags
    const mainContent =
      hashtagIndex !== -1
        ? captionText.slice(0, hashtagIndex).trim()
        : captionText;
    const hashtags =
      hashtagIndex !== -1 ? captionText.slice(hashtagIndex).trim() : "";

    // Handle templates that need a reference line before hashtags
    if (template === "dealer" || template === "bat") {
      const cleanedContext = context
        .replace(/Please include this at the end of the caption:.*$/, "")
        .trim();
      const finalCaption = `${mainContent}\n\n${cleanedContext}${
        hashtags ? `\n\n${hashtags}` : ""
      }`;
      // Return only the caption text
      return NextResponse.json({ caption: finalCaption });
    }

    // Return only the caption text
    const finalCaption = `${mainContent}${hashtags ? `\n\n${hashtags}` : ""}`;
    return NextResponse.json({ caption: finalCaption });
  } catch (error) {
    console.error("Error generating caption:", error);
    return NextResponse.json(
      { error: "Failed to generate caption" },
      { status: 500 }
    );
  }
}
