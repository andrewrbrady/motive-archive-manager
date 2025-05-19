import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Configure Vercel runtime
export const runtime = "nodejs";

// GET: Retrieve a specific saved article version by ID
export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/");
    const carIdIndex = segments.indexOf("cars") + 1;
    const carId = segments[carIdIndex];
    const versionId = segments[segments.length - 1];

    const db = await getDatabase();

    // Validate IDs
    if (!ObjectId.isValid(carId) || !ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: "Invalid car ID or version ID format" },
        { status: 400 }
      );
    }

    // Find the specific article version
    const articleVersion = await db.collection("car_article_versions").findOne({
      _id: new ObjectId(versionId),
      carId: carId,
    });

    if (!articleVersion) {
      return NextResponse.json(
        { error: "Article version not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(articleVersion);
  } catch (error) {
    console.error("Error retrieving article version:", error);
    return NextResponse.json(
      { error: "Failed to retrieve article version" },
      { status: 500 }
    );
  }
}

// PATCH: Update a specific saved article version
export async function PATCH(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/");
    const carIdIndex = segments.indexOf("cars") + 1;
    const carId = segments[carIdIndex];
    const versionId = segments[segments.length - 1];
    const updateData = await request.json();

    const db = await getDatabase();

    // Validate IDs
    if (!ObjectId.isValid(carId) || !ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: "Invalid car ID or version ID format" },
        { status: 400 }
      );
    }

    // Validate update data - at least article content is required
    if (!updateData.articleContent || !updateData.articleContent.trim()) {
      return NextResponse.json(
        { error: "Article content is required and cannot be empty" },
        { status: 400 }
      );
    }

    // Update the article version with new data
    const result = await db.collection("car_article_versions").findOneAndUpdate(
      {
        _id: new ObjectId(versionId),
        carId: carId,
      },
      {
        $set: {
          articleContent: updateData.articleContent,
          // You can update other fields if needed
          // versionName: updateData.versionName,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Article version not found or could not be updated" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating article version:", error);
    return NextResponse.json(
      { error: "Failed to update article version" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific saved article version
export async function DELETE(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;
    const segments = pathname.split("/");
    const carIdIndex = segments.indexOf("cars") + 1;
    const carId = segments[carIdIndex];
    const versionId = segments[segments.length - 1];

    const db = await getDatabase();

    // Validate IDs
    if (!ObjectId.isValid(carId) || !ObjectId.isValid(versionId)) {
      return NextResponse.json(
        { error: "Invalid car ID or version ID format" },
        { status: 400 }
      );
    }

    // Delete the article version
    const result = await db
      .collection("car_article_versions")
      .findOneAndDelete({
        _id: new ObjectId(versionId),
        carId: carId,
      });

    if (!result) {
      return NextResponse.json(
        { error: "Article version not found or could not be deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Article version deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting article version:", error);
    return NextResponse.json(
      { error: "Failed to delete article version" },
      { status: 500 }
    );
  }
}
