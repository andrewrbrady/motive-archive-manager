import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET saved articles for a car
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because the url is /cars/[id]/article/saved

    const db = await getDatabase();

    // Find all saved articles for this car
    const savedArticles = await db
      .collection("saved_articles")
      .find({ carId: new ObjectId(id) })
      .sort({ updatedAt: -1 })
      .toArray();

    return NextResponse.json({
      savedArticles,
      count: savedArticles.length,
    });
  } catch (error) {
    console.error("Error fetching saved articles:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch saved articles",
      },
      { status: 500 }
    );
  }
}

// POST to save a new article
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because the url is /cars/[id]/article/saved

    const { content, name, description } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();
    const sessionId = new ObjectId().toString();

    // Create a new saved article
    const result = await db.collection("saved_articles").insertOne({
      carId: new ObjectId(id),
      sessionId,
      content,
      name: name || "Untitled Draft",
      description: description || "",
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      sessionId,
      name: name || "Untitled Draft",
      createdAt: now,
      id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating saved article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create saved article",
      },
      { status: 500 }
    );
  }
}

// DELETE a saved article
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved/[sessionId]
    const sessionId = segments[segments.length - 1]; // -1 for the sessionId

    const db = await getDatabase();

    const result = await db.collection("saved_articles").deleteOne({
      "metadata.carId": id,
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
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete saved article",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
