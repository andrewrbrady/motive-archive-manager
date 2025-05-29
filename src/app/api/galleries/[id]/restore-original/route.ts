import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface RestoreOriginalRequest {
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

    const body: RestoreOriginalRequest = await request.json();
    const { processedImageId } = body;

    if (!processedImageId) {
      return NextResponse.json(
        { error: "Missing processedImageId parameter" },
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

    // Get the processed image
    const processedImage = await imagesCollection.findOne({
      _id: new ObjectId(processedImageId),
    });
    if (!processedImage) {
      return NextResponse.json(
        { error: "Processed image not found" },
        { status: 404 }
      );
    }

    // Check if the processed image has original image metadata
    const originalImageMetadata = processedImage.metadata?.originalImage;
    if (!originalImageMetadata) {
      return NextResponse.json(
        { error: "No original image metadata found in processed image" },
        { status: 400 }
      );
    }

    // Check if the processed image is in the gallery
    const processedImageIdString = processedImageId.toString();
    const galleryImageIds = gallery.imageIds.map((id: any) => id.toString());
    if (!galleryImageIds.includes(processedImageIdString)) {
      return NextResponse.json(
        { error: "Processed image is not in this gallery" },
        { status: 400 }
      );
    }

    // Verify the original image still exists, or recreate it if missing
    let originalImageExists = await imagesCollection.findOne({
      _id: new ObjectId(originalImageMetadata._id),
    });

    if (!originalImageExists) {
      console.log(
        `[Restore] Original image ${originalImageMetadata._id} not found in database, recreating from metadata`
      );

      // Recreate the original image record from the preserved metadata
      try {
        const originalImageRecord = {
          _id: new ObjectId(originalImageMetadata._id),
          cloudflareId: originalImageMetadata.cloudflareId,
          url: originalImageMetadata.url,
          filename: originalImageMetadata.filename,
          metadata: originalImageMetadata.metadata || {},
          carId: processedImage.carId, // Use the carId from the processed image
          createdAt:
            originalImageMetadata.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await imagesCollection.insertOne(originalImageRecord);
        originalImageExists = originalImageRecord;

        console.log(
          `[Restore] Successfully recreated original image ${originalImageMetadata._id}`
        );
      } catch (insertError) {
        console.error(
          `[Restore] Failed to recreate original image:`,
          insertError
        );
        return NextResponse.json(
          {
            error:
              "Original image no longer exists and could not be recreated. The image may have been permanently deleted.",
          },
          { status: 404 }
        );
      }
    }

    // Find the index of the processed image in the gallery
    const processedImageIndex = galleryImageIds.indexOf(processedImageIdString);

    // Replace the processed image ID with the original image ID in the gallery
    const updateResult = await galleriesCollection.updateOne(
      { _id: new ObjectId(galleryId) },
      {
        $set: {
          [`imageIds.${processedImageIndex}`]: new ObjectId(
            originalImageMetadata._id
          ),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    // Also update orderedImages if it exists
    if (gallery.orderedImages && Array.isArray(gallery.orderedImages)) {
      const orderedImageIndex = gallery.orderedImages.findIndex(
        (item: any) => item.id.toString() === processedImageIdString
      );

      if (orderedImageIndex !== -1) {
        await galleriesCollection.updateOne(
          { _id: new ObjectId(galleryId) },
          {
            $set: {
              [`orderedImages.${orderedImageIndex}.id`]: new ObjectId(
                originalImageMetadata._id
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
      message: "Original image restored successfully",
      processedImageId,
      restoredImage: {
        _id: originalImageMetadata._id,
        url: originalImageMetadata.url,
        filename: originalImageMetadata.filename,
        metadata: originalImageMetadata.metadata,
      },
      replacedAt: processedImage.metadata?.replacedAt,
      processingType: processedImage.metadata?.processingType,
    });
  } catch (error) {
    console.error("Error restoring original image:", error);
    return NextResponse.json(
      { error: "Failed to restore original image" },
      { status: 500 }
    );
  }
}
