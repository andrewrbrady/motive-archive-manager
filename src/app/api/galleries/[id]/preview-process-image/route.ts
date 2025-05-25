import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface PreviewProcessImageRequest {
  imageId: string;
  processingType: "canvas-extension" | "image-matte";
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

    const body: PreviewProcessImageRequest = await request.json();
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
        imageUrl: parameters.imageUrl,
        desiredHeight: parameters.desiredHeight,
        paddingPct: parameters.paddingPct,
        whiteThresh: parameters.whiteThresh,
        processingMethod: parameters.processingMethod,
        uploadToCloudflare: false,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
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
        uploadToCloudflare: false,
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      };
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

    if (!processingResult.success) {
      return NextResponse.json(
        { error: processingResult.error || "Failed to process image" },
        { status: 500 }
      );
    }

    // For preview processing, we don't upload to Cloudflare yet
    // We just return the processed image data URL for preview
    return NextResponse.json({
      success: true,
      message: `Image ${processingType} preview completed successfully`,
      originalImage: {
        _id: originalImage._id.toString(),
        url: originalImage.url,
        filename: originalImage.filename,
        metadata: originalImage.metadata,
        carId: originalImage.carId,
      },
      processedImage: {
        _id: "preview", // Temporary ID for preview
        url: processingResult.processedImageUrl, // Base64 data URL
        filename: `preview_${originalImage.filename}`,
        metadata: {
          category: "preview",
          processing: processingType,
          originalImage: originalImage.url,
          parameters:
            processingType === "canvas-extension"
              ? {
                  desiredHeight: parameters.desiredHeight,
                  paddingPct: parameters.paddingPct,
                  whiteThresh: parameters.whiteThresh,
                }
              : {
                  canvasWidth: parameters.canvasWidth,
                  canvasHeight: parameters.canvasHeight,
                  paddingPercent: parameters.paddingPercent,
                  matteColor: parameters.matteColor,
                },
        },
        carId: originalImage.carId,
      },
      processingResult,
    });
  } catch (error) {
    console.error("Error processing gallery image preview:", error);
    return NextResponse.json(
      { error: "Failed to process image preview" },
      { status: 500 }
    );
  }
}
