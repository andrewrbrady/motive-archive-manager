import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

interface PreviewProcessImageRequest {
  imageId: string;
  processingType: "canvas-extension" | "image-matte" | "image-crop";
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

    // Use the unified processing API
    const processingEndpoint = "/api/images/process";

    const processingParams = {
      imageId: originalImage._id.toString(),
      processingType,
      parameters: {
        ...parameters,
        imageUrl: originalImage.url, // Use the original image URL from database
        originalFilename: originalImage.filename,
        originalCarId: originalImage.carId,
      },
    };

    // Debug logging to see what URL we're passing
    console.log("🔍 Gallery processing debug:", {
      imageId: originalImage._id.toString(),
      processingType,
      imageUrl: originalImage.url,
      urlLength: originalImage.url?.length,
      urlPrefix: originalImage.url?.substring(0, 50),
      originalFilename: originalImage.filename,
    });

    // Process the image
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
      try {
        const errorData = await processingResponse.json();
        console.error("Processing endpoint returned error:", {
          status: processingResponse.status,
          statusText: processingResponse.statusText,
          error: errorData.error,
          details: errorData.details,
          processingType,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            error: errorData.error || "Failed to process image",
            details: errorData.details,
            processingMethod: errorData.processingMethod,
          },
          { status: 500 }
        );
      } catch (parseError) {
        const errorText = await processingResponse.text();
        console.error("Failed to parse error response:", {
          status: processingResponse.status,
          statusText: processingResponse.statusText,
          errorText: errorText.substring(0, 500),
          parseError:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parse error",
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          { error: `Processing failed: ${errorText}` },
          { status: 500 }
        );
      }
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
      originalImage: processingResult.originalImage,
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
              : processingType === "image-crop"
                ? {
                    cropX: parameters.cropX,
                    cropY: parameters.cropY,
                    cropWidth: parameters.cropWidth,
                    cropHeight: parameters.cropHeight,
                    outputWidth: parameters.outputWidth,
                    outputHeight: parameters.outputHeight,
                    scale: parameters.scale,
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
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    };

    console.error("Error processing gallery image preview:", errorDetails);

    return NextResponse.json(
      {
        error: "Failed to process image preview",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
