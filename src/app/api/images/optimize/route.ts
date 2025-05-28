import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const dynamic = "force-dynamic";

/**
 * Image Optimization API Route - Phase 4 Performance Optimization
 *
 * Provides server-side image optimization as a fallback when
 * Web Workers are not available or for server-side processing.
 *
 * Features:
 * 1. ✅ Multiple format support (JPEG, PNG, WebP, AVIF)
 * 2. ✅ Quality and compression optimization
 * 3. ✅ Intelligent resizing with aspect ratio preservation
 * 4. ✅ Thumbnail generation
 * 5. ✅ Performance monitoring
 */

interface OptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp" | "avif";
  operation?: "resize" | "compress" | "thumbnail" | "analyze";
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  background?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const optionsParam = formData.get("options") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Parse optimization options
    const options: OptimizationOptions = optionsParam
      ? JSON.parse(optionsParam)
      : {};

    const {
      width,
      height,
      quality = 85,
      format = "jpeg",
      operation = "compress",
      fit = "cover",
      background = "#ffffff",
    } = options;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Initialize Sharp instance
    let sharpInstance = sharp(buffer);

    // Get original image metadata
    const metadata = await sharpInstance.metadata();
    const originalSize = buffer.length;

    // Apply transformations based on operation
    switch (operation) {
      case "resize":
        if (width || height) {
          sharpInstance = sharpInstance.resize(width, height, {
            fit,
            background,
            withoutEnlargement: true,
          });
        }
        break;

      case "thumbnail":
        const thumbWidth = width || 200;
        const thumbHeight = height || 200;
        sharpInstance = sharpInstance.resize(thumbWidth, thumbHeight, {
          fit: "cover",
          position: "center",
        });
        break;

      case "analyze":
        // Return analysis without processing
        const analysis = {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: originalSize,
          hasAlpha: metadata.hasAlpha,
          channels: metadata.channels,
          density: metadata.density,
          aspectRatio:
            metadata.width && metadata.height
              ? metadata.width / metadata.height
              : null,
          isLandscape:
            metadata.width && metadata.height
              ? metadata.width > metadata.height
              : null,
          isPortrait:
            metadata.width && metadata.height
              ? metadata.height > metadata.width
              : null,
        };

        return NextResponse.json({
          success: true,
          operation: "analyze",
          analysis,
          performance: {
            processingTime: Date.now() - startTime,
          },
        });

      case "compress":
      default:
        // Just apply format and quality optimization
        break;
    }

    // Apply format-specific optimizations
    let outputBuffer: Buffer;
    let mimeType: string;

    switch (format) {
      case "webp":
        outputBuffer = await sharpInstance
          .webp({ quality, effort: 6 })
          .toBuffer();
        mimeType = "image/webp";
        break;

      case "avif":
        outputBuffer = await sharpInstance
          .avif({ quality, effort: 6 })
          .toBuffer();
        mimeType = "image/avif";
        break;

      case "png":
        outputBuffer = await sharpInstance
          .png({
            quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
          })
          .toBuffer();
        mimeType = "image/png";
        break;

      case "jpeg":
      default:
        outputBuffer = await sharpInstance
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          })
          .toBuffer();
        mimeType = "image/jpeg";
        break;
    }

    // Get final metadata
    const finalMetadata = await sharp(outputBuffer).metadata();
    const finalSize = outputBuffer.length;
    const compressionRatio = Math.round((1 - finalSize / originalSize) * 100);

    // Prepare response
    const result = {
      success: true,
      operation,
      original: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: originalSize,
      },
      optimized: {
        width: finalMetadata.width,
        height: finalMetadata.height,
        format: finalMetadata.format,
        size: finalSize,
        mimeType,
      },
      compression: {
        ratio: compressionRatio,
        savedBytes: originalSize - finalSize,
        savedPercentage: compressionRatio,
      },
      performance: {
        processingTime: Date.now() - startTime,
      },
    };

    // Return optimized image as base64 or binary
    const returnFormat = request.nextUrl.searchParams.get("return") || "base64";

    if (returnFormat === "binary") {
      return new NextResponse(outputBuffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": finalSize.toString(),
          "X-Optimization-Result": JSON.stringify(result),
        },
      });
    } else {
      // Return as base64 data URL
      const base64 = outputBuffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return NextResponse.json({
        ...result,
        dataUrl,
        base64,
      });
    }
  } catch (error) {
    console.error("[API] Image optimization failed:", error);

    return NextResponse.json(
      {
        error: "Image optimization failed",
        details: error instanceof Error ? error.message : "Unknown error",
        performance: {
          processingTime: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for optimization capabilities and stats
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "capabilities";

    switch (action) {
      case "capabilities":
        return NextResponse.json({
          supportedFormats: ["jpeg", "png", "webp", "avif"],
          supportedOperations: ["resize", "compress", "thumbnail", "analyze"],
          supportedFitModes: ["cover", "contain", "fill", "inside", "outside"],
          maxFileSize: "10MB",
          features: {
            progressiveJPEG: true,
            mozjpeg: true,
            webpEffort: true,
            avifEffort: true,
            adaptivePNG: true,
            metadataPreservation: false, // Stripped for optimization
          },
        });

      case "formats":
        // Test format support
        const testBuffer = Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
          "base64"
        );

        const formatSupport = {
          jpeg: true,
          png: true,
          webp: false,
          avif: false,
        };

        try {
          await sharp(testBuffer).webp().toBuffer();
          formatSupport.webp = true;
        } catch {}

        try {
          await sharp(testBuffer).avif().toBuffer();
          formatSupport.avif = true;
        } catch {}

        return NextResponse.json({
          formatSupport,
          sharpVersion: sharp.versions.sharp,
          libvipsVersion: sharp.versions.vips,
        });

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API] Optimization info failed:", error);
    return NextResponse.json(
      { error: "Failed to get optimization info" },
      { status: 500 }
    );
  }
}
