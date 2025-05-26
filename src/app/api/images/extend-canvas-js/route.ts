import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ExtendCanvasRequest {
  imageUrl: string;
  desiredHeight: number;
  paddingPct: number;
  whiteThresh: number;
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendCanvasRequest = await request.json();
    const {
      imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
    } = body;

    // Validate input parameters
    if (!imageUrl || !desiredHeight) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (desiredHeight < 100 || desiredHeight > 5000) {
      return NextResponse.json(
        { error: "Desired height must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (paddingPct < 0 || paddingPct > 1) {
      return NextResponse.json(
        { error: "Padding percentage must be between 0 and 1" },
        { status: 400 }
      );
    }

    if (whiteThresh !== -1 && (whiteThresh < 0 || whiteThresh > 255)) {
      return NextResponse.json(
        { error: "White threshold must be -1 or between 0 and 255" },
        { status: 400 }
      );
    }

    try {
      // Download the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error("Failed to download image");
      }

      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      // Get image metadata
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error("Could not determine image dimensions");
      }

      const originalWidth = metadata.width;
      const originalHeight = metadata.height;

      console.log(
        `Processing image: ${originalWidth}x${originalHeight} -> ${originalWidth}x${desiredHeight}`
      );

      // Simple canvas extension using Sharp
      // This is a simplified version that extends the canvas by adding white space
      let processedImageBuffer: Buffer;

      if (desiredHeight <= originalHeight) {
        // If desired height is smaller, crop from center
        const cropTop = Math.floor((originalHeight - desiredHeight) / 2);
        processedImageBuffer = await image
          .extract({
            left: 0,
            top: cropTop,
            width: originalWidth,
            height: desiredHeight,
          })
          .jpeg({ quality: 95 })
          .toBuffer();
      } else {
        // If desired height is larger, extend the canvas
        const extraHeight = desiredHeight - originalHeight;
        const topPadding = Math.floor(extraHeight / 2);
        const bottomPadding = extraHeight - topPadding;

        // Create a white background
        const background = sharp({
          create: {
            width: originalWidth,
            height: desiredHeight,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        });

        // Composite the original image onto the white background
        processedImageBuffer = await background
          .composite([
            {
              input: imageBuffer,
              top: topPadding,
              left: 0,
            },
          ])
          .jpeg({ quality: 95 })
          .toBuffer();
      }

      let result: any = {
        success: true,
        message: "Image processed successfully (JavaScript version)",
      };

      if (uploadToCloudflare) {
        try {
          // Validate Cloudflare environment variables
          if (
            !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
            !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
          ) {
            throw new Error("Cloudflare credentials not configured");
          }

          // Create filename for the processed image
          const baseFilename = originalFilename || "image";
          const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "");
          const processedFilename = `${nameWithoutExt}_extended_${desiredHeight}px_js.jpg`;

          // Create a File object from the buffer
          const processedFile = new File(
            [processedImageBuffer],
            processedFilename,
            {
              type: "image/jpeg",
            }
          );

          // Upload to Cloudflare
          const cloudflareForm = new FormData();
          cloudflareForm.append("file", processedFile);
          cloudflareForm.append("requireSignedURLs", "false");

          const cloudflareResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
              },
              body: cloudflareForm,
            }
          );

          if (!cloudflareResponse.ok) {
            throw new Error(
              `Cloudflare upload failed: ${cloudflareResponse.statusText}`
            );
          }

          const cloudflareResult = await cloudflareResponse.json();
          if (!cloudflareResult.success) {
            throw new Error(
              `Cloudflare API error: ${cloudflareResult.errors[0]?.message || "Unknown error"}`
            );
          }

          const cloudflareImageUrl =
            cloudflareResult.result.variants[0].replace(/\/public$/, "");

          // Store in MongoDB
          const db = await getDatabase();
          const now = new Date().toISOString();

          const imageDoc = {
            _id: new ObjectId(),
            cloudflareId: cloudflareResult.result.id,
            url: cloudflareImageUrl,
            filename: processedFilename,
            metadata: {
              category: "processed",
              processing: "canvas_extension_js",
              originalImage: imageUrl,
              parameters: {
                desiredHeight,
                paddingPct,
                whiteThresh,
              },
              processedAt: now,
            },
            carId: originalCarId ? new ObjectId(originalCarId) : null,
            createdAt: now,
            updatedAt: now,
          };

          await db.collection("images").insertOne(imageDoc);

          // If this processed image is associated with a car, add it to the car's processedImageIds array
          if (originalCarId) {
            try {
              await db.collection("cars").updateOne(
                { _id: new ObjectId(originalCarId) },
                {
                  $addToSet: { processedImageIds: imageDoc._id },
                  $set: { updatedAt: now },
                }
              );
              console.log(
                `Added processed image ${imageDoc._id} to car ${originalCarId}`
              );
            } catch (carUpdateError) {
              console.error(
                "Failed to update car with processed image:",
                carUpdateError
              );
              // Don't fail the whole operation if car update fails
            }
          }

          result.cloudflareUpload = {
            success: true,
            imageId: cloudflareResult.result.id,
            imageUrl: cloudflareImageUrl,
            filename: processedFilename,
            mongoId: imageDoc._id.toString(),
          };

          console.log(
            "Successfully uploaded to Cloudflare and stored in MongoDB:",
            processedFilename
          );
        } catch (uploadError) {
          console.error("Failed to upload to Cloudflare:", uploadError);
          result.cloudflareUpload = {
            success: false,
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Unknown upload error",
          };
        }
      }

      // Always return the base64 data URL as well
      const base64Image = processedImageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;
      result.processedImageUrl = dataUrl;

      return NextResponse.json(result);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error("Canvas extension (JS) error:", error);

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        return NextResponse.json(
          {
            error: "Processing timeout. The image may be too large or complex.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
