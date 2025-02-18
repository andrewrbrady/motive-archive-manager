import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = new ObjectId(params.id);
    const db = await getDatabase();

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Fetch all saved articles for this car
    const savedArticles = await db
      .collection("saved_articles")
      .find({ carId })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json(savedArticles);
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved articles" },
      { status: 500 }
    );
  }
}
