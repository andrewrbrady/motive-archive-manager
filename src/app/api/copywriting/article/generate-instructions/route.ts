import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required prompt parameter" },
        { status: 400 }
      );
    }

    console.log("Article Instructions Generation Input:", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert content writer and article planner. Your task is to analyze a given topic and provide:
1. Clear instructions for creating an engaging article
2. A structured outline for the article's sections
Your response should be informative, practical, and tailored to the specific topic.`,
        },
        {
          role: "user",
          content: `Generate article instructions and outline for the following topic: "${prompt}".
          
Please respond with JSON in this format:
{
  "instructions": "Detailed instructions for writing the article...",
  "outline": ["Section 1: Title", "Section 2: Title", ...]
}

The instructions should be comprehensive and guide the writing process. The outline should provide a clear structure with 5-8 distinct sections.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");

    return NextResponse.json({
      instructions: data.instructions || "",
      outline: data.outline || [],
    });
  } catch (error) {
    console.error("Error generating article instructions:", error);
    return NextResponse.json(
      { error: "Failed to generate article instructions" },
      { status: 500 }
    );
  }
}
