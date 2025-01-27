import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { carDetails } = await request.json();

    if (!carDetails) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are a social media manager for a luxury car dealership. Generate engaging questions that encourage followers to interact with posts about specific cars. Focus on unique features, specifications, or interesting aspects of each car. Keep questions concise, fun, and specific to the car being discussed.",
        },
        {
          role: "user",
          content: `Generate a single engaging question about this car:
Year: ${carDetails.year}
Make: ${carDetails.make}
Model: ${carDetails.model}
${carDetails.color ? `Color: ${carDetails.color}` : ""}
${carDetails.engine?.type ? `Engine: ${carDetails.engine.type}` : ""}
${
  carDetails.engine?.power?.hp
    ? `Horsepower: ${carDetails.engine.power.hp}`
    : ""
}

Requirements:
- Generate only ONE question
- Keep it short and engaging
- Focus on specific details of this car
- Do not include any additional text or context
- Do not use hashtags or emojis`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const question = completion.choices[0].message.content?.trim();

    return NextResponse.json({ question });
  } catch (error) {
    console.error("Error generating question:", error);
    return NextResponse.json(
      { error: "Failed to generate question" },
      { status: 500 }
    );
  }
}
