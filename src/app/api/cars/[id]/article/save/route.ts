import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because the url is /cars/[id]/article/save

    const { content, name, description, sessionId } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const now = new Date();

    // Create a unique ID for the saved session if not provided
    const session = sessionId || new ObjectId().toString();

    // Save the article draft
    const result = await db.collection("saved_articles").updateOne(
      {
        carId: new ObjectId(id),
        sessionId: session,
      },
      {
        $set: {
          content,
          name: name || "Untitled Draft",
          description: description || "",
          updatedAt: now,
        },
        $setOnInsert: {
          carId: new ObjectId(id),
          sessionId: session,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      sessionId: session,
      name: name || "Untitled Draft",
      updatedAt: now,
    });
  } catch (error) {
    console.error("Error saving article draft:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save article draft",
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
