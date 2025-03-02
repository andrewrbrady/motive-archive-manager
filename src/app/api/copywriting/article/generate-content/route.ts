import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { instructions, currentOutline, currentStep, currentDraft } =
      await request.json();

    if (currentOutline === undefined || currentStep === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (currentStep >= currentOutline.length) {
      return NextResponse.json(
        { error: "Current step exceeds outline length" },
        { status: 400 }
      );
    }

    const currentSection = currentOutline[currentStep];

    console.log("Article Content Generation Input:");
    console.log("Generating content for section:", currentSection);
    console.log("Current step:", currentStep, "of", currentOutline.length);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert content writer with a knack for creating engaging and informative articles.
Your task is to write a single section of an article based on the outline and instructions provided.
Respond only with the content for the specified section. Do not include section titles or numbering in your response.`,
        },
        {
          role: "user",
          content: `I'm working on an article with the following structure:
${currentOutline
  .map((item: string, index: number) => `${index + 1}. ${item}`)
  .join("\n")}

Here are the instructions for writing this article:
${instructions || "No specific instructions provided."}

${
  currentDraft
    ? `Here's what I've written so far:
${currentDraft}`
    : "I haven't written anything yet."
}

Please write the content for the next section: "${currentSection}"

The content should be comprehensive, engaging, and around 200-300 words. Focus only on this section and integrate it smoothly with any previous content.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || "";

    return NextResponse.json({
      content: content,
    });
  } catch (error) {
    console.error("Error generating article content:", error);
    return NextResponse.json(
      { error: "Failed to generate article content" },
      { status: 500 }
    );
  }
}
