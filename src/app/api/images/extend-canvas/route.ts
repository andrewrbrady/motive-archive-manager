import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface ExtendCanvasRequest {
  imageUrl: string;
  desiredHeight: number;
  paddingPct: number;
  whiteThresh: number;
  processingMethod?: "cloud" | "local";
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  requestedWidth?: number;
  requestedHeight?: number;
  scaleMultiplier?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExtendCanvasRequest = await request.json();
    const {
      imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      processingMethod,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
      requestedWidth,
      requestedHeight,
      scaleMultiplier,
    } = body;

    // Debug logging
    console.log("🔍 Canvas extension request received:", {
      processingMethod,
      hasImageUrl: !!imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
    });

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

    // Try the remote canvas extension service
    const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL;

    console.log("🔍 Remote service configuration:", {
      processingMethod,
      hasRemoteServiceUrl: !!remoteServiceUrl,
      remoteServiceUrl: remoteServiceUrl
        ? `${remoteServiceUrl.substring(0, 30)}...`
        : "not set",
    });

    // If no remote service URL is configured, return error
    if (!remoteServiceUrl) {
      return NextResponse.json(
        {
          error:
            "Canvas extension requires cloud processing. CANVAS_EXTENSION_SERVICE_URL environment variable is not configured.",
          details:
            "Local binary processing has been deprecated. Please contact support to configure cloud processing.",
          processingMethod: processingMethod || "auto",
          hasRemoteServiceUrl: false,
        },
        { status: 500 }
      );
    }

    try {
      console.log("🌐 Trying remote canvas extension service...");
      console.log("🔗 Remote service URL:", remoteServiceUrl);

      const remoteResponse = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          desiredHeight,
          paddingPct,
          whiteThresh,
        }),
      });

      if (remoteResponse.ok) {
        const remoteResult = await remoteResponse.json();
        console.log("✅ Successfully processed with remote Cloud Run service");

        // If uploadToCloudflare is requested, upload the result
        if (uploadToCloudflare && remoteResult.processedImageUrl) {
          try {
            // Convert base64 data URL to buffer
            const base64Data = remoteResult.processedImageUrl.replace(
              /^data:image\/[a-z]+;base64,/,
              ""
            );
            const imageBuffer = Buffer.from(base64Data, "base64");

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

            // Generate filename based on the new naming convention
            let processedFilename;
            if (scaleMultiplier && scaleMultiplier >= 2) {
              const reqWidth =
                requestedWidth || Math.round((desiredHeight * 16) / 9); // Default aspect ratio
              const reqHeight = requestedHeight || desiredHeight;
              processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
            } else {
              const reqWidth =
                requestedWidth || Math.round((desiredHeight * 16) / 9);
              const reqHeight = requestedHeight || desiredHeight;
              processedFilename = `${nameWithoutExt}-EXTENDED-${reqWidth}x${reqHeight}.jpg`;
            }

            // Create a File object from the buffer
            const processedFile = new File([imageBuffer], processedFilename, {
              type: "image/jpeg",
            });

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
                processing: "canvas_extension",
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

            // Return the result with Cloudflare upload info
            return NextResponse.json({
              success: true,
              message:
                "Image processed successfully with Cloud Run service and uploaded to Cloudflare",
              processedImageUrl: remoteResult.processedImageUrl,
              remoteServiceUsed: true,
              cloudflareUpload: {
                success: true,
                imageId: cloudflareResult.result.id,
                imageUrl: cloudflareImageUrl,
                filename: processedFilename,
                mongoId: imageDoc._id.toString(),
              },
            });
          } catch (uploadError) {
            console.error(
              "Failed to upload Cloud Run result to Cloudflare:",
              uploadError
            );
            return NextResponse.json({
              success: true,
              message: "Image processed successfully with Cloud Run service",
              processedImageUrl: remoteResult.processedImageUrl,
              remoteServiceUsed: true,
              cloudflareUpload: {
                success: false,
                error:
                  uploadError instanceof Error
                    ? uploadError.message
                    : "Unknown upload error",
              },
            });
          }
        }

        // Return the result with additional metadata (no Cloudflare upload)
        return NextResponse.json({
          success: true,
          message: "Image processed successfully with Cloud Run service",
          processedImageUrl: remoteResult.processedImageUrl,
          remoteServiceUsed: true,
          uploadToCloudflare,
          originalFilename,
          originalCarId,
        });
      } else {
        const errorText = await remoteResponse.text();
        console.log(
          "⚠️ Remote service failed:",
          remoteResponse.status,
          errorText
        );

        return NextResponse.json(
          {
            error: `Cloud Run service failed: ${errorText}`,
            details:
              "The remote image processing service is unavailable. Please try again later or contact support.",
            processingMethod,
            remoteServiceUrl: remoteServiceUrl
              ? `${remoteServiceUrl.substring(0, 30)}...`
              : "not set",
          },
          { status: 500 }
        );
      }
    } catch (remoteError) {
      console.log("⚠️ Remote service error");
      console.error("Remote service error details:", remoteError);

      return NextResponse.json(
        {
          error: `Cloud Run service failed: ${remoteError instanceof Error ? remoteError.message : "Unknown error"}`,
          details:
            "The remote image processing service is unavailable. Please try again later or contact support.",
          processingMethod,
          remoteServiceUrl: remoteServiceUrl
            ? `${remoteServiceUrl.substring(0, 30)}...`
            : "not set",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Canvas extension error:", error);

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
