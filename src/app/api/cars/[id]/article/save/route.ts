import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Configure Vercel runtime
export const runtime = "nodejs";

// POST: Save a generated article
export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const segments = request.nextUrl.pathname.split("/");
    const carId = segments[segments.indexOf("cars") + 1];

    // Validate car ID
    if (!carId || !ObjectId.isValid(carId)) {
      return NextResponse.json(
        { error: "Valid car ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const { articleContent, promptSnapshot, modelUsed, versionName } =
      await request.json();

    // Validate required fields
    if (!articleContent || !articleContent.trim()) {
      return NextResponse.json(
        { error: "Article content is required" },
        { status: 400 }
      );
    }

    // Verify car exists
    const car = await db
      .collection("cars")
      .findOne({ _id: new ObjectId(carId) });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Create article version document
    const articleVersion = {
      carId,
      articleContent,
      promptSnapshot: promptSnapshot || null,
      modelUsed: modelUsed || "unknown",
      versionName: versionName || `Version ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to database
    const result = await db
      .collection("car_article_versions")
      .insertOne(articleVersion);

    if (!result.insertedId) {
      return NextResponse.json(
        { error: "Failed to save article version" },
        { status: 500 }
      );
    }

    // Return saved article with ID
    const savedArticle = {
      ...articleVersion,
      _id: result.insertedId,
    };

    return NextResponse.json(savedArticle, { status: 201 });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article" },
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
