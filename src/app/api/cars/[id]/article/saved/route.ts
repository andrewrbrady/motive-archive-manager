import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET: Retrieve saved article versions for a car
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/");
    const carIdIndex = segments.indexOf("cars") + 1;
    const carId = segments[carIdIndex];

    const db = await getDatabase();

    // Validate car ID
    if (!carId || !ObjectId.isValid(carId)) {
      return NextResponse.json(
        { error: "Valid car ID is required" },
        { status: 400 }
      );
    }

    // Fetch all saved article versions for this car
    const savedArticles = await db
      .collection("car_article_versions")
      .find({ carId })
      .sort({ updatedAt: -1 }) // Most recent first
      .toArray();

    return NextResponse.json(savedArticles);
  } catch (error) {
    console.error("Error retrieving saved articles:", error);
    return NextResponse.json(
      { error: "Failed to retrieve saved articles" },
      { status: 500 }
    );
  }
}

// POST to save a new article
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

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
      content,
      name: name || "Untitled Draft",
      description: description || "",
      metadata: {
        carId: new ObjectId(id),
        sessionId,
        model: "manual",
      },
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      _id: result.insertedId.toString(),
      sessionId,
      name: name || "Untitled Draft",
      createdAt: now,
      updatedAt: now,
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
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved
    const sessionId = segments[segments.length - 1];

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    const result = await db.collection("saved_articles").deleteOne({
      $or: [
        { carId: new ObjectId(id), sessionId },
        { "metadata.carId": new ObjectId(id), "metadata.sessionId": sessionId },
      ],
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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
