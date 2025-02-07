import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { ModelType } from "@/components/ModelSelector";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const model =
      (searchParams.get("model") as ModelType) || "claude-3-5-sonnet";
    const carId = params.id;

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Get car details
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get all research files for this car
    const researchFiles = await db
      .collection("research_files")
      .find({ carId })
      .toArray();

    // Extract content from research files
    const researchContent = researchFiles
      .map((file) => file.content)
      .filter(Boolean)
      .join("\n\n");

    // Prepare the prompt for article generation
    const prompt = `You are a professional automotive journalist writing an in-depth article about a ${
      car.year
    } ${car.make} ${car.model}. 
    
Car Details:
${JSON.stringify(car, null, 2)}

Research Content:
${researchContent}

Please write a comprehensive, engaging article that covers:
1. Introduction and overview
2. Historical context and significance
3. Design and exterior features
4. Interior and comfort
5. Engine and performance
6. Driving experience and handling
7. Technology and features
8. Market position and value
9. Conclusion

Use a professional, journalistic tone and incorporate specific details from both the car data and research content. Format the article with appropriate headings and paragraphs.`;

    // Determine API configuration based on model
    const isDeepSeek = model.startsWith("deepseek");
    const isClaude = model.startsWith("claude");

    const apiConfig = {
      url: isDeepSeek
        ? process.env.DEEPSEEK_API_URL || "https://api.deepseek.com"
        : isClaude
        ? process.env.CLAUDE_API_URL || "https://api.anthropic.com"
        : "https://api.openai.com/v1/chat/completions",
      key: isDeepSeek
        ? process.env.DEEPSEEK_API_KEY
        : isClaude
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY,
    };

    const endpoint = isClaude ? "/v1/messages" : "/v1/chat/completions";

    // Prepare the request body based on the API
    const requestBody = isClaude
      ? {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          system:
            "You are a professional automotive journalist writing in-depth articles about vehicles.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }
      : {
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You are a professional automotive journalist writing in-depth articles about vehicles.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        };

    // Call the appropriate API
    const response = await fetch(apiConfig.url + endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isClaude
          ? {
              "x-api-key": apiConfig.key,
              "anthropic-version": "2023-06-01",
            }
          : {
              Authorization: `Bearer ${apiConfig.key}`,
            }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("API Error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Failed to generate article: ${response.statusText}`);
    }

    const data = await response.json();
    const article = isClaude
      ? data.content[0].text
      : data.choices[0].message.content;

    // Store the generated article in MongoDB
    await db.collection("car_articles").updateOne(
      { carId },
      {
        $set: {
          content: article,
          model,
          generatedAt: new Date(),
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ article });
  } catch (error) {
    console.error("Error generating article:", error);
    return NextResponse.json(
      { error: "Failed to generate article" },
      { status: 500 }
    );
  }
}
