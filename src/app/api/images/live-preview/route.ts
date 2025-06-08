import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

interface LivePreviewRequest {
  cachedImagePath: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  previewImageDimensions: {
    width: number;
    height: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: LivePreviewRequest = await request.json();
    const {
      cachedImagePath,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      outputWidth,
      outputHeight,
      scale,
      previewImageDimensions,
    } = body;

    // Validate inputs
    if (!cachedImagePath || !fs.existsSync(cachedImagePath)) {
      return NextResponse.json(
        { error: "Cached image not found" },
        { status: 400 }
      );
    }

    if (
      cropX < 0 ||
      cropY < 0 ||
      cropWidth <= 0 ||
      cropHeight <= 0 ||
      outputWidth <= 0 ||
      outputHeight <= 0 ||
      scale <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid crop parameters" },
        { status: 400 }
      );
    }

    try {
      // Get actual dimensions of the cached image
      const imageMetadata = await sharp(cachedImagePath).metadata();
      const actualWidth = imageMetadata.width!;
      const actualHeight = imageMetadata.height!;

      console.log("Live preview generation:", {
        cachedImagePath,
        actualDimensions: { actualWidth, actualHeight },
        previewDimensions: previewImageDimensions,
        originalCrop: { cropX, cropY, cropWidth, cropHeight },
      });

      // Calculate scaling factor based on actual vs preview dimensions
      let scaledCropX = cropX;
      let scaledCropY = cropY;
      let scaledCropWidth = cropWidth;
      let scaledCropHeight = cropHeight;

      if (previewImageDimensions) {
        const scaleFactorX = actualWidth / previewImageDimensions.width;
        const scaleFactorY = actualHeight / previewImageDimensions.height;

        scaledCropX = Math.round(cropX * scaleFactorX);
        scaledCropY = Math.round(cropY * scaleFactorY);
        scaledCropWidth = Math.round(cropWidth * scaleFactorX);
        scaledCropHeight = Math.round(cropHeight * scaleFactorY);

        console.log("Scaled coordinates:", {
          scaleFactors: { scaleFactorX, scaleFactorY },
          scaledCrop: {
            scaledCropX,
            scaledCropY,
            scaledCropWidth,
            scaledCropHeight,
          },
        });
      }

      // Validate and adjust scaled crop area to ensure it fits within image boundaries
      if (
        scaledCropX < 0 ||
        scaledCropY < 0 ||
        scaledCropX + scaledCropWidth > actualWidth ||
        scaledCropY + scaledCropHeight > actualHeight
      ) {
        console.warn("Crop area exceeds boundaries, adjusting...");

        // Adjust crop area to fit within image boundaries
        scaledCropX = Math.max(0, Math.min(scaledCropX, actualWidth - 1));
        scaledCropY = Math.max(0, Math.min(scaledCropY, actualHeight - 1));
        scaledCropWidth = Math.min(scaledCropWidth, actualWidth - scaledCropX);
        scaledCropHeight = Math.min(
          scaledCropHeight,
          actualHeight - scaledCropY
        );

        if (scaledCropWidth <= 0 || scaledCropHeight <= 0) {
          return NextResponse.json(
            { error: "Invalid crop area after adjustment" },
            { status: 400 }
          );
        }
      }

      console.log("Using Sharp for image cropping:", {
        input: cachedImagePath,
        crop: {
          left: scaledCropX,
          top: scaledCropY,
          width: scaledCropWidth,
          height: scaledCropHeight,
        },
        resize: { width: outputWidth, height: outputHeight },
      });

      // Use Sharp to crop and resize the image
      const croppedImageBuffer = await sharp(cachedImagePath)
        .extract({
          left: scaledCropX,
          top: scaledCropY,
          width: scaledCropWidth,
          height: scaledCropHeight,
        })
        .resize(outputWidth, outputHeight, {
          fit: "fill",
          background: { r: 255, g: 255, b: 255, alpha: 1 }, // White background
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Convert to base64 for preview
      const previewImageData = croppedImageBuffer.toString("base64");

      const processingTime = Date.now() - startTime;
      console.log(`Preview generated in ${processingTime}ms using Sharp`);

      return NextResponse.json({
        success: true,
        message: "Live preview generated successfully",
        previewImageData,
        processingTime,
        actualImageDimensions: { width: actualWidth, height: actualHeight },
        scaledCropCoordinates: {
          x: scaledCropX,
          y: scaledCropY,
          width: scaledCropWidth,
          height: scaledCropHeight,
        },
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("Live preview error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate live preview",
        success: false,
        processingTime,
      },
      { status: 500 }
    );
  }
}
