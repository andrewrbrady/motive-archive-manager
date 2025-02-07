import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const { db } = await connectToDatabase();

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
