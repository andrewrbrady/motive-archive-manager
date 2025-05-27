import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ProcessImageRequest {
  imageId: string;
  processingType: "canvas-extension" | "image-matte" | "image-crop";
  parameters: any;
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    // For path like /api/galleries/[id]/process-image, the ID is at index -2
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

    const body: ProcessImageRequest = await request.json();
    const { imageId, processingType, parameters } = body;

    if (!imageId || !processingType || !parameters) {
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
      _id: new ObjectId(imageId),
    });
    if (!originalImage) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Check if the image is in the gallery
    const imageIdString = imageId.toString();
    const galleryImageIds = gallery.imageIds.map((id: any) => id.toString());
    if (!galleryImageIds.includes(imageIdString)) {
      return NextResponse.json(
        { error: "Image is not in this gallery" },
        { status: 400 }
      );
    }

    // Determine the processing endpoint and prepare parameters
    let processingEndpoint: string;
    let processingParams: any;

    if (processingType === "canvas-extension") {
      processingEndpoint = "/api/images/extend-canvas";

      processingParams = {
        imageUrl: originalImage.url,
        desiredHeight: parameters.desiredHeight,
        paddingPct: parameters.paddingPct,
        whiteThresh: parameters.whiteThresh,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      };
    } else if (processingType === "image-matte") {
      processingEndpoint = "/api/images/create-matte";

      processingParams = {
        imageUrl: originalImage.url,
        canvasWidth: parameters.canvasWidth,
        canvasHeight: parameters.canvasHeight,
        paddingPercent: parameters.paddingPercent,
        matteColor: parameters.matteColor,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      };
    } else if (processingType === "image-crop") {
      processingEndpoint = "/api/images/crop-image";

      processingParams = {
        imageUrl: originalImage.url,
        cropX: parameters.cropX,
        cropY: parameters.cropY,
        cropWidth: parameters.cropWidth,
        cropHeight: parameters.cropHeight,
        outputWidth: parameters.outputWidth,
        outputHeight: parameters.outputHeight,
        scale: parameters.scale,
        uploadToCloudflare: true,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      };
    } else {
      return NextResponse.json(
        { error: "Invalid processing type" },
        { status: 400 }
      );
    }

    // Process the image
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

    // Get the new image data
    const newImageId = processingResult.cloudflareUpload.mongoId;
    const newImage = await imagesCollection.findOne({
      _id: new ObjectId(newImageId),
    });

    if (!newImage) {
      return NextResponse.json(
        { error: "Failed to retrieve processed image" },
        { status: 500 }
      );
    }

    // Replace the original image ID with the new image ID in the gallery
    const originalImageIndex = galleryImageIds.indexOf(imageIdString);
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
        (item: any) => item.id.toString() === imageIdString
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
      message: `Image ${processingType} completed successfully`,
      originalImageId: imageId,
      newImage: {
        _id: newImage._id.toString(),
        url: newImage.url,
        filename: newImage.filename,
        metadata: newImage.metadata,
        carId: newImage.carId,
      },
      processingResult,
    });
  } catch (error) {
    console.error("Error processing gallery image:", error);
    return NextResponse.json(
      { error: "Failed to process image" },
      { status: 500 }
    );
  }
}
