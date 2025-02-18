import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET saved articles for a car
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const db = await getDatabase();

    // Get all saved articles for this car
    const savedArticles = await db
      .collection("saved_articles")
      .find({
        $or: [
          { "metadata.carId": new ObjectId(carId) },
          { "metadata.carId": carId },
        ],
      })
      .sort({ createdAt: -1 })
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

// POST to save a new article
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const { content, stage, metadata } = await request.json();

    if (!content || !stage || !metadata) {
      return NextResponse.json(
        { error: "Content, stage, and metadata are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const savedArticle = {
      content,
      stage,
      metadata: {
        ...metadata,
        carId, // Ensure carId is set
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("saved_articles").insertOne(savedArticle);

    return NextResponse.json(savedArticle);
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article" },
      { status: 500 }
    );
  }
}

// DELETE a saved article
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const { id: carId, sessionId } = params;
    const db = await getDatabase();

    const result = await db.collection("saved_articles").deleteOne({
      "metadata.carId": carId,
      "metadata.sessionId": sessionId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Saved article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved article:", error);
    return NextResponse.json(
      { error: "Failed to delete saved article" },
      { status: 500 }
    );
  }
}
