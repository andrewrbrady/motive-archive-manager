import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface CreateMatteRequest {
  imageUrl: string;
  canvasWidth: number;
  canvasHeight: number;
  paddingPercent: number;
  matteColor: string;
  uploadToCloudflare?: boolean;
  originalFilename?: string;
  originalCarId?: string;
  processingMethod?: "cloud" | "local";
  requestedWidth?: number;
  requestedHeight?: number;
  scaleMultiplier?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateMatteRequest = await request.json();
    const {
      imageUrl,
      canvasWidth,
      canvasHeight,
      paddingPercent,
      matteColor,
      uploadToCloudflare,
      originalFilename,
      originalCarId,
      processingMethod = "cloud",
      requestedWidth,
      requestedHeight,
      scaleMultiplier,
    } = body;

    // Validate input parameters
    if (!imageUrl || !canvasWidth || !canvasHeight) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (canvasWidth < 100 || canvasWidth > 5000) {
      return NextResponse.json(
        { error: "Canvas width must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (canvasHeight < 100 || canvasHeight > 5000) {
      return NextResponse.json(
        { error: "Canvas height must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (paddingPercent < 0 || paddingPercent > 50) {
      return NextResponse.json(
        { error: "Padding percentage must be between 0 and 50" },
        { status: 400 }
      );
    }

    // Validate hex color format
    if (!/^#[0-9A-F]{6}$/i.test(matteColor)) {
      return NextResponse.json(
        { error: "Matte color must be a valid hex color (e.g., #000000)" },
        { status: 400 }
      );
    }

    // Try the remote matte service
    const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL; // Reuse the same service

    console.log("🔍 Remote matte service configuration:", {
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
            "Matte generation requires cloud processing. CANVAS_EXTENSION_SERVICE_URL environment variable is not configured.",
          details:
            "Local binary processing has been deprecated. Please contact support to configure cloud processing.",
          processingMethod: processingMethod || "auto",
          hasRemoteServiceUrl: false,
        },
        { status: 500 }
      );
    }

    try {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🌐 Trying remote matte service...");
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("🔗 Remote service URL:", remoteServiceUrl);

      // ADDED: Transform Cloudflare URLs for remote service compatibility (copied from canvas extension)
      let processableImageUrl = imageUrl;

      if (imageUrl.includes("imagedelivery.net")) {
        // Extract the base Cloudflare URL (account + image ID) regardless of current format
        const cloudflareMatch = imageUrl.match(
          /https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)/
        );

        if (cloudflareMatch) {
          const [, accountHash, imageId] = cloudflareMatch;
          const baseCloudflareUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;

          // Use custom variant with correct width for remote service compatibility
          processableImageUrl = `${baseCloudflareUrl}/w=2160,fit=scale-down`;
          console.log("🔧 Image Matte - Using scale-down variant:", {
            original: imageUrl,
            baseUrl: baseCloudflareUrl,
            variant: "w=2160,fit=scale-down",
            note: "For remote service compatibility",
          });
        } else {
          console.warn("⚠️ Could not parse Cloudflare URL format:", imageUrl);
          // Fallback: if URL doesn't match expected format, use as-is or add /public
          if (!imageUrl.includes("/public") && !imageUrl.match(/\/w=\d+/)) {
            processableImageUrl = `${imageUrl}/public`;
          }
        }
      }

      console.log("🔗 Image Matte - Using processable URL:", {
        original: imageUrl?.substring(0, 100) + "...",
        processable: processableImageUrl?.substring(0, 100) + "...",
      });

      const remoteResponse = await fetch(`${remoteServiceUrl}/create-matte`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: processableImageUrl,
          canvasWidth,
          canvasHeight,
          paddingPercent,
          matteColor,
        }),
      });

      if (remoteResponse.ok) {
        const remoteResult = await remoteResponse.json();
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Successfully processed with remote Cloud Run service");

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
              const reqWidth = requestedWidth || canvasWidth;
              const reqHeight = requestedHeight || canvasHeight;
              processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}-${scaleMultiplier}X.jpg`;
            } else {
              const reqWidth = requestedWidth || canvasWidth;
              const reqHeight = requestedHeight || canvasHeight;
              processedFilename = `${nameWithoutExt}-MATTE-${reqWidth}x${reqHeight}.jpg`;
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
                processing: "image_matte",
                originalImage: imageUrl,
                parameters: {
                  canvasWidth,
                  canvasHeight,
                  paddingPercent,
                  matteColor,
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
                "Image matte created successfully with Cloud Run service and uploaded to Cloudflare",
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
              message:
                "Image matte created successfully with Cloud Run service",
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
          message: "Image matte created successfully with Cloud Run service",
          processedImageUrl: remoteResult.processedImageUrl,
          remoteServiceUsed: true,
          uploadToCloudflare,
          originalFilename,
          originalCarId,
        });
      } else {
        const errorText = await remoteResponse.text();
        console.log(
          "⚠️ Remote matte service failed:",
          remoteResponse.status,
          errorText
        );

        return NextResponse.json(
          {
            error: `Cloud Run matte service failed: ${errorText}`,
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
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("⚠️ Remote matte service error");
      console.error("Remote matte service error details:", remoteError);

      return NextResponse.json(
        {
          error: `Cloud Run matte service failed: ${remoteError instanceof Error ? remoteError.message : "Unknown error"}`,
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
    console.error("Matte creation error:", error);

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
