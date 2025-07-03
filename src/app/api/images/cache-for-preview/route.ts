import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";

interface CacheImageRequest {
  imageUrl: string;
  imageId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CacheImageRequest = await request.json();
    const { imageUrl, imageId } = body;

    if (!imageUrl || !imageId) {
      return NextResponse.json(
        { error: "Image URL and ID are required" },
        { status: 400 }
      );
    }

    // Create cache directory
    const cacheDir = path.join(process.cwd(), "temp", "cached-images");
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Generate cache file path
    const sessionId = uuidv4();
    const cacheFileName = `${imageId}_${sessionId}.jpg`;
    const cachePath = path.join(cacheDir, cacheFileName);

    try {
      // Download the image
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("Downloading image for cache:", imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      // Get image metadata
      const imageMetadata = await sharp(Buffer.from(imageBuffer)).metadata();
      const originalWidth = imageMetadata.width!;
      const originalHeight = imageMetadata.height!;

      // Save the image to cache
      fs.writeFileSync(cachePath, Buffer.from(imageBuffer));

      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Image cached successfully: ${cachePath}`);
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Original dimensions: ${originalWidth}×${originalHeight}`);

      // Set up cleanup after 30 minutes
      setTimeout(
        () => {
          try {
            if (fs.existsSync(cachePath)) {
              fs.unlinkSync(cachePath);
              // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`Cleaned up cached image: ${cachePath}`);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up cached image:", cleanupError);
          }
        },
        30 * 60 * 1000
      ); // 30 minutes

      return NextResponse.json({
        success: true,
        message: "Image cached successfully",
        cachedPath: cachePath,
        originalDimensions: {
          width: originalWidth,
          height: originalHeight,
        },
        sessionId,
      });
    } catch (error) {
      console.error("Error caching image:", error);

      // Clean up on error
      try {
        if (fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up failed cache:", cleanupError);
      }

      throw error;
    }
  } catch (error) {
    console.error("Cache image error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to cache image",
        success: false,
      },
      { status: 500 }
    );
  }
}
