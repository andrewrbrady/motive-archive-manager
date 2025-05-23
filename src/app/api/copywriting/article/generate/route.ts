import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sample MDX structure for reference
const MDX_EXAMPLE = `---
title: "Low-Mileage 2008 Porsche 911 GT3 RS with 7k Miles and Single Owner History"
subtitle: "This 2008 Porsche 911 GT3 RS, ordered after the standard allocation period, presents a 7k-mile example maintained by its original owner since new."
type: "page"
slug: "2008-porsche-911-gt3-rs"
author: "Andrew Brady"
tags: ["porsche", "gt3rs", "porsche gt3rs"]
cover: "https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/9d6447e4-848f-4b4a-50d4-84fbd2c51200/public"
---

{/* Hero Section */}
<div className="relative w-full mb-16 border-b border-gray-200 pb-16">
  <div className="max-w-7xl mx-auto">
    <h2 className="text-2xl font-bold mb-4">2008 Porsche 911 997.1 GT3 RS</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      <div className="relative w-full">
        <img src="https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/bd4c1ff2-70e4-43bc-98f4-8ed35e533400/public" alt="2008 Porsche 911 GT3 RS" className="w-full h-full object-cover rounded-lg cursor-pointer transition-opacity hover:opacity-90" />
      </div>
      <div>
        <p className="text-lg">
          This 2008 Porsche 911 997.1 GT3 RS shows just 7,000 miles on the
          odometer and has been maintained by a single owner since new.
          According to the seller, it was specially ordered after the standard
          GT3 RS allocation period had concluded. Finished in Green exterior
          with contrasting black RS graphics, this GT3 RS combines track-focused
          engineering with preservation that has contributed to the increasing
          value of these limited-production Porsches in the collector market.
        </p>
      </div>
    </div>
  </div>
</div>

{/* Article Content */}
<div className="prose mx-auto">
  <p className="my-6">
    Powering this motorsport-derived 911 is the 3.6-liter Mezger flat-six
    engine, featuring VarioCam variable valve timing, titanium connecting rods,
    and dry-sump lubrication. Factory-rated at 415 horsepower and 300 lb-ft of
    torque, this powerplant channels its output through a six-speed manual
    transaxle and limited-slip differential. The owner has added GMG exhaust
    components, modifying the car's exhaust note while maintaining the vehicle's
    mechanical configuration.
  </p>
</div>`;

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      articleType,
      carId,
      carDetails,
      guidance,
      temperature,
      maxTokens,
    } = await request.json();

    console.log("Article generation request received:", {
      title,
      articleType,
      carId: carId || "none",
      carDetailsAvailable: !!carDetails,
      carDetailsKeys: carDetails ? Object.keys(carDetails) : [],
      guidance: guidance || "none",
      temperature,
      maxTokens,
    });

    if (!title || typeof title !== "string") {
      // [REMOVED] // [REMOVED] console.log("Invalid title:", title);
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    if (!articleType || typeof articleType !== "string") {
      // [REMOVED] // [REMOVED] console.log("Invalid articleType:", articleType);
      return NextResponse.json(
        { error: "Article type is required and must be a string" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Missing Anthropic API key");
      return NextResponse.json(
        { error: "Anthropic API key is not configured" },
        { status: 500 }
      );
    }

    // Construct the prompt based on the article type and car details
    let prompt = `Create an engaging MDX article about ${title}. `;
    // [REMOVED] // [REMOVED] console.log("Base prompt:", prompt);

    if (articleType === "listing") {
      prompt +=
        "This article should be structured like a car listing, highlighting specifications, condition, history, and unique features. ";
    } else if (articleType === "review") {
      prompt +=
        "This article should be structured like a car review, discussing driving experience, performance, design, and providing an overall assessment. ";
    } else if (articleType === "story") {
      prompt +=
        "This article should tell a compelling story about this car, focusing on its historical significance, interesting anecdotes, and cultural impact. ";
    } else {
      prompt +=
        "Format this as a general informative article about the vehicle. ";
    }
    // [REMOVED] // [REMOVED] console.log("Prompt with article type:", prompt);

    // Add user guidance if provided
    if (guidance) {
      prompt += `\n\nThe user has provided the following guidance for this article: "${guidance}". Please follow these instructions carefully.`;
      // [REMOVED] // [REMOVED] console.log("Added user guidance to prompt");
    }

    // Add car details to the prompt if available
    if (carDetails) {
      // If we have minimal car details (just year, make, model)
      if (Object.keys(carDetails).length <= 3) {
        const carBasics =
          `${carDetails.year || ""} ${carDetails.make || ""} ${carDetails.model || ""}`.trim();
        prompt += `\n\nThis article is about a ${carBasics}. Please use your knowledge to create compelling content about this vehicle model, even though detailed specifications aren't available.`;
        // [REMOVED] // [REMOVED] console.log("Added minimal car details to prompt:", carBasics);
      } else {
        // We have comprehensive car details
        console.log(
          "Adding comprehensive car details to prompt, keys:",
          Object.keys(carDetails)
        );
        prompt += `\n\nUse the following car details in your article:\n${JSON.stringify(carDetails, null, 2)}`;
      }
    } else {
      // [REMOVED] // [REMOVED] console.log("No car details available for the prompt");
    }

    // Add formatting instructions for MDX with a reference example
    // [REMOVED] // [REMOVED] console.log("Adding MDX formatting instructions");
    prompt += `\n\nPlease format the article in MDX with appropriate frontmatter and components.

Here's an example of the MDX format I'm looking for:

${MDX_EXAMPLE.substring(0, 500)}... (example truncated)

Your article should follow this exact structure:

1. Frontmatter section with:
   - title, subtitle, type, slug, author, tags, and cover placeholder
   - Ensure all strings are properly quoted
   - Use consistent indentation

2. Hero section:
   - Use a full-width container with proper margin handling:
     \`<div className="relative w-full mb-16 border-b border-gray-200 pb-16">\`
   - Wrap content in a max-width container:
     \`<div className="max-w-7xl mx-auto">\`
   - Include a grid layout for image and text
   - ALWAYS close all div tags properly

3. Article content sections:
   - Wrap each major content section in:
     \`<div className="prose mx-auto">\`
   - Use semantic HTML within prose sections (p, h2, h3, ul, etc.)
   - ALWAYS close the prose div before starting a new section
   - Add descriptive comments before each major section

4. Image galleries:
   - Use the provided grid layout system
   - Include placeholder comments for images
   - Maintain consistent spacing between sections

Important:
- Never mix conflicting margin classes (e.g., don't combine -mx-[100vw] with mx-auto)
- Always close all div tags properly
- Use comments to mark the start of major sections
- Keep consistent indentation throughout the document

Return ONLY the MDX content with no additional explanation or commentary.`;

    // [REMOVED] // [REMOVED] console.log("Final prompt length:", prompt.length);

    // Call the Anthropic API
    // [REMOVED] // [REMOVED] console.log("Calling Anthropic API with model: claude-3-7-sonnet-20250219");
    console.log(
      `Using temperature: ${temperature || 0.7}, maxTokens: ${maxTokens || 4000}`
    );

    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: maxTokens || 4000,
      temperature: temperature || 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the generated content
    let generatedContent = "";
    if (response.content[0].type === "text") {
      generatedContent = response.content[0].text;
      console.log(
        "Received response from Anthropic, content length:",
        generatedContent.length
      );
    } else {
      console.error(
        "Unexpected response format from Anthropic:",
        response.content
      );
    }

    return NextResponse.json({ content: generatedContent });
  } catch (error) {
    console.error("Error generating article:", error);
    return NextResponse.json(
      { error: "Failed to generate article content" },
      { status: 500 }
    );
  }
}
