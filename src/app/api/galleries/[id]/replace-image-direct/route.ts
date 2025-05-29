import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ReplaceImageDirectRequest {
  originalImageId: string;
  processedImageId: string;
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const galleryId = segments[segments.indexOf("galleries") + 1];

    if (!ObjectId.isValid(galleryId)) {
      console.error(
        "Invalid gallery ID:",
        galleryId,
        "from path:",
        url.pathname
      );
      return NextResponse.json(
        { error: "Invalid gallery ID format" },
        { status: 400 }
      );
    }

    const body: ReplaceImageDirectRequest = await request.json();
    const { originalImageId, processedImageId } = body;

    if (!originalImageId || !processedImageId) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: originalImageId and processedImageId",
        },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    if (
      !ObjectId.isValid(originalImageId) ||
      !ObjectId.isValid(processedImageId)
    ) {
      return NextResponse.json(
        { error: "Invalid image ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const galleriesCollection = db.collection("galleries");
    const imagesCollection = db.collection("images");

    // Get the gallery
    const gallery = await galleriesCollection.findOne({
      _id: new ObjectId(galleryId),
    });
    if (!gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    // Get the original image to verify it exists
    const originalImage = await imagesCollection.findOne({
      _id: new ObjectId(originalImageId),
    });
    if (!originalImage) {
      return NextResponse.json(
        { error: "Original image not found" },
        { status: 404 }
      );
    }

    // Get the processed image to verify it exists
    const processedImage = await imagesCollection.findOne({
      _id: new ObjectId(processedImageId),
    });
    if (!processedImage) {
      return NextResponse.json(
        { error: "Processed image not found" },
        { status: 404 }
      );
    }

    // Check if the original image is in the gallery
    const originalImageIdString = originalImageId.toString();
    const galleryImageIds = gallery.imageIds.map((id: any) => id.toString());
    if (!galleryImageIds.includes(originalImageIdString)) {
      return NextResponse.json(
        { error: "Original image is not in this gallery" },
        { status: 400 }
      );
    }

    // Find the index of the original image in the gallery
    const originalImageIndex = galleryImageIds.indexOf(originalImageIdString);

    // Replace the original image ID with the processed image ID in the gallery
    const updateResult = await galleriesCollection.updateOne(
      { _id: new ObjectId(galleryId) },
      {
        $set: {
          [`imageIds.${originalImageIndex}`]: new ObjectId(processedImageId),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Also update orderedImages if it exists
    if (gallery.orderedImages && Array.isArray(gallery.orderedImages)) {
      const orderedImageIndex = gallery.orderedImages.findIndex(
        (item: any) => item.id.toString() === originalImageIdString
      );

      if (orderedImageIndex !== -1) {
        await galleriesCollection.updateOne(
          { _id: new ObjectId(galleryId) },
          {
            $set: {
              [`orderedImages.${orderedImageIndex}.id`]: new ObjectId(
                processedImageId
              ),
            },
          }
        );
      }
    }

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update gallery" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Image replaced in gallery successfully",
      originalImageId,
      processedImage: {
        _id: processedImage._id.toString(),
        url: processedImage.url,
        filename: processedImage.filename,
        metadata: processedImage.metadata,
        carId: processedImage.carId,
      },
    });
  } catch (error) {
    console.error("Error replacing gallery image directly:", error);
    return NextResponse.json(
      { error: "Failed to replace image in gallery" },
      { status: 500 }
    );
  }
}
