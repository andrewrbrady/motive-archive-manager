import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

const execAsync = promisify(exec);

interface CropImageRequest {
  imageUrl: string;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
  scale: number;
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  previewImageDimensions?: {
    width: number;
    height: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CropImageRequest = await request.json();
    const {
      imageUrl,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      outputWidth,
      outputHeight,
      scale,
      uploadToCloudflare = false,
      originalFilename,
      originalCarId,
      previewImageDimensions,
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate crop parameters
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

    // Create temporary directory for processing
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempId = uuidv4();
    const inputPath = path.join(tempDir, `input_${tempId}.jpg`);
    const outputPath = path.join(tempDir, `output_${tempId}.jpg`);

    try {
      // Download the image
      console.log("Downloading image from:", imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      fs.writeFileSync(inputPath, Buffer.from(imageBuffer));

      // Get actual dimensions of the downloaded image
      const imageMetadata = await sharp(inputPath).metadata();
      const actualWidth = imageMetadata.width!;
      const actualHeight = imageMetadata.height!;

      console.log("Actual image dimensions:", { actualWidth, actualHeight });
      console.log("Original crop coordinates:", {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      });

      // Calculate scaling factor if we have preview dimensions
      let scaledCropX = cropX;
      let scaledCropY = cropY;
      let scaledCropWidth = cropWidth;
      let scaledCropHeight = cropHeight;

      if (previewImageDimensions) {
        const scaleFactorX = actualWidth / previewImageDimensions.width;
        const scaleFactorY = actualHeight / previewImageDimensions.height;

        console.log("Scale factors:", { scaleFactorX, scaleFactorY });

        scaledCropX = Math.round(cropX * scaleFactorX);
        scaledCropY = Math.round(cropY * scaleFactorY);
        scaledCropWidth = Math.round(cropWidth * scaleFactorX);
        scaledCropHeight = Math.round(cropHeight * scaleFactorY);

        console.log("Scaled crop coordinates:", {
          scaledCropX,
          scaledCropY,
          scaledCropWidth,
          scaledCropHeight,
        });
      }

      // Validate scaled crop area against actual image dimensions
      if (
        scaledCropX < 0 ||
        scaledCropY < 0 ||
        scaledCropX + scaledCropWidth > actualWidth ||
        scaledCropY + scaledCropHeight > actualHeight
      ) {
        console.error("Scaled crop area validation failed:", {
          actualDimensions: { actualWidth, actualHeight },
          scaledCrop: {
            scaledCropX,
            scaledCropY,
            scaledCropWidth,
            scaledCropHeight,
          },
          exceedsRight: scaledCropX + scaledCropWidth > actualWidth,
          exceedsBottom: scaledCropY + scaledCropHeight > actualHeight,
        });

        return NextResponse.json(
          {
            error: `Crop area exceeds image boundaries. Image: ${actualWidth}×${actualHeight}, Crop: ${scaledCropX},${scaledCropY} ${scaledCropWidth}×${scaledCropHeight}`,
          },
          { status: 400 }
        );
      }

      // Prepare the command with scaled coordinates
      const command = [
        binaryPath,
        "--input",
        inputPath,
        "--output",
        outputPath,
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

      console.log("Executing crop command:", command);

      // Execute the crop command
      const { stdout, stderr } = await execAsync(command);

      if (stderr && !stderr.includes("Warning")) {
        console.error("Crop command stderr:", stderr);
        throw new Error(`Crop processing failed: ${stderr}`);
      }

      console.log("Crop command output:", stdout);

      // Check if output file was created
      if (!fs.existsSync(outputPath)) {
        throw new Error("Output file was not created");
      }

      // Read the processed image
      const processedImageBuffer = fs.readFileSync(outputPath);

      let result: any = {
        success: true,
        message: "Image cropped successfully",
        imageSize: processedImageBuffer.length,
        actualImageDimensions: { width: actualWidth, height: actualHeight },
        scaledCropCoordinates: {
          x: scaledCropX,
          y: scaledCropY,
          width: scaledCropWidth,
          height: scaledCropHeight,
        },
      };

      // Upload to Cloudflare if requested
      if (uploadToCloudflare) {
        try {
          // Create FormData for the upload
          const formData = new FormData();
          const filename = originalFilename
            ? `cropped_${originalFilename}`
            : `cropped_image_${tempId}.jpg`;

          // Create a File object from the buffer
          const file = new File([processedImageBuffer], filename, {
            type: "image/jpeg",
          });

          formData.append("files", file);

          // Add car association and metadata information
          if (originalCarId) {
            formData.append("carId", originalCarId);
          }

          formData.append(
            "metadata",
            JSON.stringify({
              category: "processed",
              processing: "image_crop",
              originalImage: imageUrl,
              parameters: {
                cropX: scaledCropX,
                cropY: scaledCropY,
                cropWidth: scaledCropWidth,
                cropHeight: scaledCropHeight,
                outputWidth,
                outputHeight,
                scale,
              },
              processedAt: new Date().toISOString(),
            })
          );

          const uploadResponse = await fetch(
            `${request.nextUrl.origin}/api/images/upload`,
            {
              method: "POST",
              body: formData, // Send as FormData, not JSON
            }
          );

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            result.cloudflareUpload = uploadResult;
          } else {
            console.error(
              "Failed to upload to Cloudflare:",
              uploadResponse.status
            );
            result.cloudflareUpload = {
              success: false,
              error: "Upload failed",
            };
          }
        } catch (uploadError) {
          console.error("Error uploading to Cloudflare:", uploadError);
          result.cloudflareUpload = { success: false, error: "Upload error" };
        }
      } else {
        // Return the image as base64 if not uploading to Cloudflare
        result.imageData = processedImageBuffer.toString("base64");
      }

      return NextResponse.json(result);
    } finally {
      // Clean up temporary files
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary files:", cleanupError);
      }
    }
  } catch (error) {
    console.error("Error in crop-image API:", error);
    return NextResponse.json(
      { error: "Failed to process image crop" },
      { status: 500 }
    );
  }
}
