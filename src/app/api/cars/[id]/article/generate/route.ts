import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because path is /cars/[id]/article/generate

    const { model = "gpt-4o", style, outline, sections } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const db = await getDatabase();

    // Get car details
    const car = await db.collection("cars").findOne({ _id: new ObjectId(id) });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    const carInfo = {
      _id: car._id,
      make: car.make,
      model: car.model,
      year: car.year,
      trim: car.manufacturing?.trim,
      engine: car.engine,
      color: car.color,
      vin: car.vin,
    };

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    };

    let promptContent = "";
    let systemPrompt = "";

    // Decide on content generation strategy
    if (style === "outline" && outline) {
      // Generate from outline
      promptContent = `Generate an article about this car using the following outline:\n\n${outline}\n\nInclude all the points from the outline and expand on them appropriately.`;
      systemPrompt = `You are a professional automotive writer. Write an engaging and informative article about a ${car.year} ${car.make} ${car.model}. 
      Format your response in markdown. Do not include a title or introduction - start with the first section heading.
      Focus on being accurate, engaging, and maintaining a tone suitable for luxury car enthusiasts.`;
    } else if (style === "sections" && sections) {
      // Generate from sections
      promptContent = `Generate an article about this car with the following sections:\n\n${(
        sections as string[]
      )
        .map((section: string) => `- ${section}`)
        .join(
          "\n"
        )}\n\nCreate content for each section that is informative and engaging.`;
      systemPrompt = `You are a professional automotive writer. Write an engaging and informative article about a ${car.year} ${car.make} ${car.model}.
      Format your response in markdown with the requested sections as headings.
      Focus on being accurate, engaging, and maintaining a tone suitable for luxury car enthusiasts.`;
    } else if (style === "point-by-point" && outline) {
      // Generate one section at a time
      const outlinePoints = outline
        .split("\n")
        .filter((point: string) => point.trim());
      const point = outlinePoints[0];

      if (!point) {
        return NextResponse.json(
          { error: "Invalid outline point" },
          { status: 400 }
        );
      }

      promptContent = `Generate content for this section of an article about a ${car.year} ${car.make} ${car.model}:\n\n${point}\n\nCreate approximately 1-2 paragraphs of engaging content.`;
      systemPrompt = `You are a professional automotive writer. Write an engaging and informative section for an article about a ${car.year} ${car.make} ${car.model}.
      Format your response in markdown.
      Focus on being accurate, engaging, and maintaining a tone suitable for luxury car enthusiasts.`;
    } else {
      // Default to general article
      promptContent = `Write a comprehensive article about this ${car.year} ${car.make} ${car.model}.`;
      systemPrompt = `You are a professional automotive writer. Write an engaging and informative article about a ${car.year} ${car.make} ${car.model}.
      Format your response in markdown with appropriate sections. Include:
      - A section about performance and driving experience
      - A section about design and aesthetics
      - A section about technology and features
      - A section about the car's place in automotive history or its market segment
      
      Focus on being accurate, engaging, and maintaining a tone suitable for luxury car enthusiasts.`;
    }

    // Use OpenAI to generate the article
    const generateResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: `${promptContent}\n\nHere are details about the specific car:\n${JSON.stringify(
                carInfo,
                null,
                2
              )}`,
            },
          ],
          temperature: 0.7,
          top_p: 0.9,
          frequency_penalty: 0.2,
          presence_penalty: 0.1,
        }),
      }
    );

    if (!generateResponse.ok) {
      console.error(
        "OpenAI API error:",
        generateResponse.status,
        await generateResponse.text()
      );
      return NextResponse.json(
        { error: "Failed to generate article" },
        { status: 500 }
      );
    }

    const data = await generateResponse.json();
    const content = data.choices[0].message.content;

    return NextResponse.json({
      success: true,
      content,
      usage: data.usage,
      style,
      model,
    });
  } catch (error) {
    console.error("Error generating article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate article",
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
