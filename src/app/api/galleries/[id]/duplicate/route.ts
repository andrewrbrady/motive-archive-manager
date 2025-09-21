import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const galleryId = segments[segments.length - 2]; // galleries/[id]/duplicate

    if (!ObjectId.isValid(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");

    // Get the original gallery
    const originalGallery = await galleriesCollection.findOne({
      _id: new ObjectId(galleryId),
    });

    if (!originalGallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Create the duplicated gallery
    const now = new Date();
    const duplicatedGallery = {
      _id: new ObjectId(),
      name: `${originalGallery.name} (Copy)`,
      description: originalGallery.description || "",
      imageIds: [...(originalGallery.imageIds || [])], // Copy the image IDs
      primaryImageId: originalGallery.primaryImageId || undefined, // Copy the primaryImageId
      orderedImages: originalGallery.orderedImages
        ? [...originalGallery.orderedImages]
        : undefined, // Copy the ordered images if they exist
      createdAt: now,
      updatedAt: now,
    };

    // Insert the duplicated gallery
    const result = await galleriesCollection.insertOne(duplicatedGallery);

    if (!result.acknowledged) {
      return NextResponse.json(
        { error: "Failed to create duplicate gallery" },
        { status: 500 }
      );
    }

    // Return the duplicated gallery with the same structure as the original
    const responseGallery = {
      ...duplicatedGallery,
      _id: duplicatedGallery._id.toString(),
      imageIds: duplicatedGallery.imageIds.map((id: ObjectId) => id.toString()),
      primaryImageId: duplicatedGallery.primaryImageId?.toString(),
      createdAt: duplicatedGallery.createdAt.toISOString(),
      updatedAt: duplicatedGallery.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Gallery duplicated successfully",
      gallery: responseGallery,
    });
  } catch (error) {
    console.error("Error duplicating gallery:", error);
    return NextResponse.json(
      { error: "Failed to duplicate gallery" },
      { status: 500 }
    );
  }
}
