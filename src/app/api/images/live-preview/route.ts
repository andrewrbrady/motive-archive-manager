import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

const execAsync = promisify(exec);

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

    // Check if the C++ binary exists
    const binaryPath = path.join(process.cwd(), "image_cropper");
    if (!fs.existsSync(binaryPath)) {
      return NextResponse.json(
        {
          error:
            "Image cropper binary not found. Please run the build script to compile the C++ tools.",
        },
        { status: 500 }
      );
    }

    // Create preview output directory
    const previewDir = path.join(process.cwd(), "temp", "live-previews");
    if (!fs.existsSync(previewDir)) {
      fs.mkdirSync(previewDir, { recursive: true });
    }

    const previewId = uuidv4();
    const outputPath = path.join(previewDir, `preview_${previewId}.jpg`);

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

      // Validate scaled crop area
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

      // Execute the C++ cropper for preview
      const command = [
        binaryPath,
        "--input",
        `"${cachedImagePath}"`,
        "--output",
        `"${outputPath}"`,
        "--crop-x",
        scaledCropX.toString(),
        "--crop-y",
        scaledCropY.toString(),
        "--crop-width",
        scaledCropWidth.toString(),
        "--crop-height",
        scaledCropHeight.toString(),
        "--output-width",
        outputWidth.toString(),
        "--output-height",
        outputHeight.toString(),
        "--scale",
        scale.toString(),
      ].join(" ");

      console.log("Executing preview command:", command);

      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout for previews
      });

      if (stderr && !stderr.includes("Warning")) {
        console.error("Preview command stderr:", stderr);
        throw new Error(`Preview generation failed: ${stderr}`);
      }

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error("Preview output file was not created");
      }

      // Read the preview image and convert to base64
      const previewImageBuffer = fs.readFileSync(outputPath);
      const previewImageData = previewImageBuffer.toString("base64");

      // Clean up preview file immediately
      fs.unlinkSync(outputPath);

      const processingTime = Date.now() - startTime;
      console.log(`Preview generated in ${processingTime}ms`);

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
      // Clean up on error
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up preview file:", cleanupError);
      }

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
