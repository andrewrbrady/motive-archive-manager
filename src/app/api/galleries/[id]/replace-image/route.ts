import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ReplaceImageRequest {
  originalImageId: string;
  processingType: "canvas-extension" | "image-matte" | "crop";
  parameters: any;
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

    // Process and upload the image to Cloudflare
    let processingEndpoint: string;
    let processingParams: any;

    if (processingType === "canvas-extension") {
      processingEndpoint = "/api/images/extend-canvas";

      processingParams = {
        imageUrl: parameters.imageUrl,
        desiredHeight: parameters.desiredHeight,
        paddingPct: parameters.paddingPct,
        whiteThresh: parameters.whiteThresh,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
        requestedWidth: parameters.requestedWidth,
        requestedHeight: parameters.requestedHeight,
        scaleMultiplier: parameters.scaleMultiplier,
      };
    } else if (processingType === "crop") {
      processingEndpoint = "/api/images/crop-image";

      processingParams = {
        imageUrl: parameters.imageUrl,
        cropX: parameters.cropX,
        cropY: parameters.cropY,
        cropWidth: parameters.cropWidth,
        cropHeight: parameters.cropHeight,
        outputWidth: parameters.outputWidth,
        outputHeight: parameters.outputHeight,
        scale: parameters.scale,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
        requestedWidth: parameters.requestedWidth,
        requestedHeight: parameters.requestedHeight,
      };
    } else {
      processingEndpoint = "/api/images/create-matte";

      processingParams = {
        imageUrl: parameters.imageUrl,
        canvasWidth: parameters.canvasWidth,
        canvasHeight: parameters.canvasHeight,
        paddingPercent: parameters.paddingPercent,
        matteColor: parameters.matteColor,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
        requestedWidth: parameters.requestedWidth,
        requestedHeight: parameters.requestedHeight,
        scaleMultiplier: parameters.scaleMultiplier,
      };
    }

    // Process the image and upload to Cloudflare
    const processingResponse = await fetch(
      `${request.nextUrl.origin}${processingEndpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processingParams),
      }
    );

    if (!processingResponse.ok) {
      const errorData = await processingResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to process image" },
        { status: 500 }
      );
    }

    const processingResult = await processingResponse.json();

    if (!processingResult.cloudflareUpload?.success) {
      return NextResponse.json(
        { error: "Failed to upload processed image to Cloudflare" },
        { status: 500 }
      );
    }

    // Get the new image data - fix the structure lookup
    const newImageId = processingResult.cloudflareUpload.mongoId;

    if (!newImageId) {
      console.error(
        "No image ID found in upload result:",
        processingResult.cloudflareUpload
      );
      return NextResponse.json(
        { error: "Failed to get processed image ID from upload result" },
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
    const updateResult = await galleriesCollection.updateOne(
      { _id: new ObjectId(galleryId) },
      {
        $set: {
          [`imageIds.${originalImageIndex}`]: newImageId,
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
              [`orderedImages.${orderedImageIndex}.id`]: newImageId,
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
