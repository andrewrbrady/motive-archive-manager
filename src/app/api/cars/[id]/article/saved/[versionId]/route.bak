import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved/[sessionId]
    const sessionId = segments[segments.length - 1]; // -1 for the sessionId at the end

    const db = await getDatabase();

    // Find the specific saved article
    const savedArticle = await db.collection("saved_articles").findOne({
      carId: new ObjectId(id),
      sessionId: sessionId,
    });

    if (!savedArticle) {
      return NextResponse.json(
        { error: "Saved article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(savedArticle);
  } catch (error) {
    console.error("Error fetching saved article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch saved article",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved/[sessionId]
    const sessionId = segments[segments.length - 1]; // -1 for the sessionId at the end

    const { content, name, description } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();

    // Update the saved article
    const result = await db.collection("saved_articles").updateOne(
      {
        carId: new ObjectId(id),
        sessionId: sessionId,
      },
      {
        $set: {
          content,
          name: name || "Untitled Draft",
          description: description || "",
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Saved article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      name: name || "Untitled Draft",
      updatedAt: now,
    });
  } catch (error) {
    console.error("Error updating saved article:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update saved article",
      },
      { status: 500 }
    );
  }
}

// DELETE a saved article by sessionId
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/saved/[sessionId]
    const sessionId = segments[segments.length - 1]; // -1 for the sessionId at the end

    const db = await getDatabase();

    // Delete the saved article
    const result = await db.collection("saved_articles").deleteOne({
      carId: new ObjectId(id),
      sessionId: sessionId,
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
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
