import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PATCH - Add images to gallery
export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const galleryId = segments[segments.length - 2]; // Get gallery ID from URL

    if (!ObjectId.isValid(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { imageIds } = body;

    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: "imageIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Convert string IDs to ObjectIds
    const processedImageIds = imageIds.map((id: string) => {
      if (!ObjectId.isValid(id)) {
        throw new Error(`Invalid image ID format: ${id}`);
      }
      return new ObjectId(id);
    });

    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");

    // Check if gallery exists
    const gallery = await galleriesCollection.findOne({
      _id: new ObjectId(galleryId),
    });

    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Add images to gallery (avoiding duplicates with $addToSet)
    const updateResult = await galleriesCollection.updateOne(
      { _id: new ObjectId(galleryId) },
      {
        $addToSet: { imageIds: { $each: processedImageIds } },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${imageIds.length} image(s) added to gallery`,
      galleryId,
      addedImageIds: imageIds,
    });
  } catch (error) {
    console.error("Error adding images to gallery:", error);
    return NextResponse.json(
      { error: "Failed to add images to gallery" },
      { status: 500 }
    );
  }
}
