import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

interface ReplaceImageRequest {
  originalImageId: string;
  processingType: "canvas-extension" | "image-matte" | "crop" | "image-crop";
  parameters: any;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }
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

    const body: ReplaceImageRequest = await request.json();
    const { originalImageId, processingType, parameters } = body;

    if (!originalImageId || !processingType || !parameters) {
      return NextResponse.json(
        { error: "Missing required parameters" },
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

    // Get the original image
    const originalImage = await imagesCollection.findOne({
      _id: new ObjectId(originalImageId),
    });
    if (!originalImage) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
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

    // Use the unified processing API which handles Cloudflare upload
    const processingEndpoint = "/api/images/process";

    const processingParams = {
      imageId: originalImage._id.toString(),
      processingType: processingType === "crop" ? "image-crop" : processingType, // Normalize crop -> image-crop
      parameters: {
        ...parameters,
        imageUrl: originalImage.url, // Use the original image URL from database
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      },
    };

    // Process the image and upload to Cloudflare
    // For development, always use localhost. For production, use the request's origin
    const baseUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : request.nextUrl.origin;

    const processingResponse = await fetch(`${baseUrl}${processingEndpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(processingParams),
    });

    if (!processingResponse.ok) {
      const errorData = await processingResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to process image" },
        { status: 500 }
      );
    }

    const processingResult = await processingResponse.json();

    console.log("🔍 Gallery Replace - Processing result received:", {
      success: processingResult.success,
      hasProcessedImage: !!processingResult.processedImage,
      processedImageId: processingResult.processedImage?._id,
      hasCloudflareUpload:
        !!processingResult.processingResult?.cloudflareUpload,
      cloudflareUploadMongoId:
        processingResult.processingResult?.cloudflareUpload?.mongoId,
    });

    if (!processingResult.success) {
      console.error(
        "❌ Gallery Replace - Processing failed:",
        processingResult.error
      );
      return NextResponse.json(
        { error: processingResult.error || "Failed to process image" },
        { status: 500 }
      );
    }

    // Get the new image data from the unified API response
    const newImageId = processingResult.processedImage?._id;

    console.log("🔍 Gallery Replace - Extracted newImageId:", {
      newImageId,
      processedImageStructure: Object.keys(
        processingResult.processedImage || {}
      ),
    });

    if (!newImageId) {
      console.error(
        "❌ Gallery Replace - No image ID found in processing result:",
        {
          processingResult: processingResult,
          processedImage: processingResult.processedImage,
          cloudflareUpload: processingResult.processingResult?.cloudflareUpload,
        }
      );
      return NextResponse.json(
        { error: "Failed to get processed image ID from processing result" },
        { status: 500 }
      );
    }

    const newImage = await imagesCollection.findOne({
      _id: new ObjectId(newImageId),
    });

    if (!newImage) {
      console.error("Image not found in database with ID:", newImageId);
      return NextResponse.json(
        { error: "Failed to retrieve processed image" },
        { status: 500 }
      );
    }

    // Store original image metadata in the new image for restore functionality
    await imagesCollection.updateOne(
      { _id: new ObjectId(newImageId) },
      {
        $set: {
          "metadata.originalImage": {
            _id: originalImage._id.toString(),
            url: originalImage.url,
            filename: originalImage.filename,
            cloudflareId: originalImage.cloudflareId,
            metadata: originalImage.metadata,
            createdAt: originalImage.createdAt,
          },
          "metadata.replacedAt": new Date().toISOString(),
          "metadata.processingType": processingType,
          "metadata.processingParameters": parameters,
        },
      }
    );

    // Find the index of the original image in the gallery
    const originalImageIndex = galleryImageIds.indexOf(originalImageIdString);

    // Replace the original image ID with the processed image ID in the gallery
    console.log("🔄 Gallery Replace - Updating gallery:", {
      galleryId,
      originalImageIndex,
      originalImageIdString,
      newImageId: newImageId.toString(),
      updatePath: `imageIds.${originalImageIndex}`,
    });

    const updateResult = await galleriesCollection.updateOne(
      { _id: new ObjectId(galleryId) },
      {
        $set: {
          [`imageIds.${originalImageIndex}`]: new ObjectId(newImageId),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    console.log("📝 Gallery Replace - Main imageIds update result:", {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    // Also update orderedImages if it exists
    if (gallery.orderedImages && Array.isArray(gallery.orderedImages)) {
      const orderedImageIndex = gallery.orderedImages.findIndex(
        (item: any) => item.id.toString() === originalImageIdString
      );

      console.log("🔄 Gallery Replace - Updating orderedImages:", {
        hasOrderedImages: true,
        orderedImageIndex,
        orderedImagesLength: gallery.orderedImages.length,
      });

      if (orderedImageIndex !== -1) {
        const orderedUpdateResult = await galleriesCollection.updateOne(
          { _id: new ObjectId(galleryId) },
          {
            $set: {
              [`orderedImages.${orderedImageIndex}.id`]: new ObjectId(
                newImageId
              ),
            },
          }
        );

        console.log("📝 Gallery Replace - OrderedImages update result:", {
          matchedCount: orderedUpdateResult.matchedCount,
          modifiedCount: orderedUpdateResult.modifiedCount,
          acknowledged: orderedUpdateResult.acknowledged,
        });
      }
    } else {
      console.log("🔄 Gallery Replace - No orderedImages to update");
    }

    if (updateResult.modifiedCount === 0) {
      console.error("❌ Gallery Replace - Failed to update gallery:", {
        updateResult,
        galleryId,
        originalImageIndex,
        newImageId,
      });
      return NextResponse.json(
        { error: "Failed to update gallery" },
        { status: 500 }
      );
    }

    console.log("✅ Gallery Replace - Successfully updated gallery!");

    return NextResponse.json({
      success: true,
      message: "Image processed and replaced in gallery successfully",
      originalImageId,
      processedImage: {
        _id: newImage._id.toString(),
        url: newImage.url,
        filename: newImage.filename,
        metadata: newImage.metadata,
        carId: newImage.carId,
      },
      processingResult,
    });
  } catch (error) {
    console.error("Error replacing gallery image:", error);
    return NextResponse.json(
      { error: "Failed to replace image in gallery" },
      { status: 500 }
    );
  }
}
