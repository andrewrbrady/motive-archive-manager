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
  previewImageDimensions?: { width: number; height: number };
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
    console.log("🚨🚨🚨 Canvas extension request received 🚨🚨🚨:", {
      processingMethod,
      hasImageUrl: !!imageUrl,
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
      requestedWidth,
      requestedHeight,
      scaleMultiplier,
      originalFilename,
      originalCarId,
      hasPreviewImageDimensions: !!body.previewImageDimensions,
      allBodyKeys: Object.keys(body),
      bodyPreviewImageDimensions: body.previewImageDimensions,
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

    // Get remote service URL
    const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL;

    if (!remoteServiceUrl) {
      return NextResponse.json(
        {
          error: "Canvas extension requires remote processing service",
          details:
            "CANVAS_EXTENSION_SERVICE_URL environment variable not configured",
          processingMethod: processingMethod || "auto",
          hasRemoteServiceUrl: false,
        },
        { status: 500 }
      );
    }

    console.log("🔧 Canvas Extension - Using remote C service processing:", {
      remoteServiceUrl: remoteServiceUrl?.substring(0, 50) + "...",
      imageUrl: imageUrl?.substring(0, 50) + "...",
      desiredHeight,
    });

    try {
      // DO NOT SCALE HERE - frontend already scaled the dimensions
      // The scaleMultiplier is only used for filename generation
      const finalDesiredHeight = desiredHeight;

      console.log(
        "🔍 Canvas Extension - Using original dimensions (no double scaling):",
        {
          originalDesiredHeight: desiredHeight,
          finalDesiredHeight,
          scaleMultiplier,
          note: "Frontend already scaled dimensions, backend should not scale again",
        }
      );

      // For Cloudflare URLs, construct the proper URL based on requirements (COPIED FROM CROP TOOL)
      let processableImageUrl = imageUrl;

      if (imageUrl.includes("imagedelivery.net")) {
        // Extract the base Cloudflare URL (account + image ID) regardless of current format
        const cloudflareMatch = imageUrl.match(
          /https:\/\/imagedelivery\.net\/([^\/]+)\/([^\/]+)/
        );

        if (cloudflareMatch) {
          const [, accountHash, imageId] = cloudflareMatch;
          const baseCloudflareUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;

          // Use custom variant with correct width for 4:5 aspect ratio
          processableImageUrl = `${baseCloudflareUrl}/w=2160,fit=scale-down`;
          console.log("🔧 Canvas Extension - Using public variant:", {
            original: imageUrl,
            baseUrl: baseCloudflareUrl,
            variant: "public",
            scaleMultiplier,
            note: "Simple public variant for canvas extension",
          });
        } else {
          console.warn("⚠️ Could not parse Cloudflare URL format:", imageUrl);
          // Fallback: if URL doesn't match expected format, use as-is or add /public
          if (!imageUrl.includes("/public") && !imageUrl.match(/\/w=\d+/)) {
            processableImageUrl = `${imageUrl}/public`;
          }
        }
      }

      console.log("🔍 Canvas Extension - Preparing for remote C service:", {
        originalDesiredHeight: desiredHeight,
        finalDesiredHeight,
        scaleMultiplier,
        requestedWidth,
        requestedHeight,
        imageUrl: processableImageUrl?.substring(0, 100) + "...",
      });

      // Use the Cloudflare variant URL directly since variants are publicly accessible
      let serviceImageUrl = processableImageUrl;

      console.log("🔗 Canvas Extension - Using Cloudflare variant URL:", {
        serviceImageUrl: serviceImageUrl?.substring(0, 100) + "...",
        note: "Variants are configured as Always Public",
      });

      // Use the requested dimensions directly since the service supports them
      const adjustedDesiredHeight = finalDesiredHeight;

      if (requestedWidth && requestedHeight) {
        console.log(
          "🔧 Canvas Extension - Using requested dimensions directly:",
          {
            desiredHeight: adjustedDesiredHeight,
            requestedDimensions: `${requestedWidth}×${requestedHeight}`,
            note: "Remote service supports requestedWidth/Height parameters",
          }
        );
      }

      console.log("📤 Canvas Extension - Sending to remote C service:", {
        remoteServiceUrl,
        serviceImageUrl: serviceImageUrl?.substring(0, 100) + "...",
        payload: {
          imageUrl: serviceImageUrl,
          desiredHeight: adjustedDesiredHeight,
          paddingPct,
          whiteThresh,
          requestedWidth,
          note: "Using requestedWidth only to preserve aspect ratio, extend height naturally",
        },
      });

      const remotePayload = {
        imageUrl: serviceImageUrl,
        desiredHeight: adjustedDesiredHeight,
        paddingPct,
        whiteThresh,
        requestedWidth,
        requestedHeight,
      };

      console.log(
        "🔍 ACTUAL payload being sent to canvas service:",
        remotePayload
      );

      const remoteResponse = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(remotePayload),
        // Add timeout for remote service
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      console.log(
        `📥 Remote service response: ${remoteResponse.status} ${remoteResponse.statusText}`
      );

      if (remoteResponse.ok) {
        const remoteResult = await remoteResponse.json();
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("✅ Successfully processed with remote C service");
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("📊 Remote result keys:", Object.keys(remoteResult));

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

            console.log("🔍 Canvas Extension - Cloudflare upload successful:", {
              mongoId: imageDoc._id.toString(),
              cloudflareImageUrl,
              processedFilename,
              cloudflareId: cloudflareResult.result.id,
              scaleMultiplier,
              originalCarId,
            });

            // Return the result with Cloudflare upload info
            return NextResponse.json({
              success: true,
              message:
                "Image processed successfully with remote C service and uploaded to Cloudflare",
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
              "Failed to upload remote service result to Cloudflare:",
              uploadError
            );
            return NextResponse.json({
              success: true,
              message: "Image processed successfully with remote C service",
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
          message: "Image processed successfully with remote C service",
          processedImageUrl: remoteResult.processedImageUrl,
          remoteServiceUsed: true,
          uploadToCloudflare,
          originalFilename,
          originalCarId,
        });
      } else {
        const errorText = await remoteResponse.text();
        console.error(
          "❌ Remote C service failed:",
          remoteResponse.status,
          errorText
        );

        return NextResponse.json(
          {
            error: `Remote C service processing failed: ${errorText}`,
            details: "Remote image processing failed. Please try again.",
            processingMethod,
            remoteServiceUrl: remoteServiceUrl?.substring(0, 50) + "...",
          },
          { status: 500 }
        );
      }
    } catch (remoteError) {
      console.error("❌ Remote C service error:", remoteError);

      let errorMessage = "Remote processing failed";
      if (remoteError instanceof Error) {
        errorMessage = remoteError.message;

        if (remoteError.name === "AbortError") {
          errorMessage = "Remote service timeout. Please try again.";
        }
      }

      return NextResponse.json(
        {
          error: `Remote C service error: ${errorMessage}`,
          details: "Remote image processing failed. Please try again.",
          processingMethod,
          remoteServiceUrl: remoteServiceUrl?.substring(0, 50) + "...",
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
