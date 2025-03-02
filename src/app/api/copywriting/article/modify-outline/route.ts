import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { instructions, currentOutline, modifications } =
      await request.json();

    if (!currentOutline || !modifications) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log("Article Outline Modification Input:");
    console.log("Current Outline:", currentOutline);
    console.log("Modification Request:", modifications);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert content writer and article planner. Your task is to modify an existing article outline based on specific requests.
You should maintain the overall structure while implementing the requested changes.
Respond only with the updated outline in the specified JSON format.`,
        },
        {
          role: "user",
          content: `Here is the original article outline:
${currentOutline
  .map((item: string, index: number) => `${index + 1}. ${item}`)
  .join("\n")}

Here are the original instructions for the article:
${instructions || "No specific instructions provided."}

Please modify this outline based on the following request: "${modifications}"

Respond with JSON in this format:
{
  "outline": ["Section 1: Title", "Section 2: Title", ...]
}

The outline should have 5-8 distinct sections.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      outline: data.outline || [],
    });
  } catch (error) {
    console.error("Error modifying article outline:", error);
    return NextResponse.json(
      { error: "Failed to modify article outline" },
      { status: 500 }
    );
  }
}
