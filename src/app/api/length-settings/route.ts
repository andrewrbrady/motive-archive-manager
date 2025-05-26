import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

// GET - Fetch length settings for caption generators
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const settings = await db
      .collection("lengthSettings")
      .find({})
      .sort({ key: 1 })
      .toArray();

    // If no custom settings exist, return defaults
    if (settings.length === 0) {
      return NextResponse.json(defaultLengthSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching length settings:", error);
    // Return defaults on error to ensure the app keeps working
    return NextResponse.json(defaultLengthSettings);
  }
}
