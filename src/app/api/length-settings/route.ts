import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const defaultLengthSettings = [
  {
    key: "concise",
    name: "Concise",
    description: "1-2 lines",
    instructions:
      "Keep the caption brief and to the point. Focus on the most essential details only. Aim for 1-2 lines maximum.",
  },
  {
    key: "standard",
    name: "Standard",
    description: "2-3 lines",
    instructions:
      "Provide a balanced caption with key details about the vehicle. Include make, model, year, and one or two standout features. Aim for 2-3 lines.",
  },
  {
    key: "detailed",
    name: "Detailed",
    description: "3-4 lines",
    instructions:
      "Create a comprehensive caption that includes vehicle specifications, notable features, condition details, and context. Aim for 3-4 lines with rich descriptive language.",
  },
  {
    key: "comprehensive",
    name: "Comprehensive",
    description: "4+ lines",
    instructions:
      "Write an extensive caption covering all relevant aspects: full specifications, history, unique features, condition, market context, and appeal. Use 4 or more lines with detailed storytelling.",
  },
];

// GET - Fetch length settings for caption generators (public endpoint)
export async function GET(request: NextRequest): Promise<NextResponse<object>> {
  const startTime = Date.now();

  try {
    console.log("🔧 Length Settings API: Starting request");

    const { db } = await connectToDatabase();
    const settings = await db
      .collection("lengthSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    console.log(
      `🔧 Length Settings API: Found ${settings.length} custom settings`
    );

    // If no custom settings exist, return defaults
    if (settings.length === 0) {
      console.log(
        "🔧 Length Settings API: No custom settings found, returning defaults"
      );
      return NextResponse.json(defaultLengthSettings);
    }

    console.log(
      `✅ Length Settings API: Returning custom settings (${Date.now() - startTime}ms)`
    );
    return NextResponse.json(settings);
  } catch (error) {
    console.error("💥 Length Settings API: Error fetching length settings:", {
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return defaults on error to ensure the app keeps working
    console.log("🔧 Length Settings API: Returning defaults due to error");
    return NextResponse.json(defaultLengthSettings);
  }
}
