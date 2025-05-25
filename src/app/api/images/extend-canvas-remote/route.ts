import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { GoogleAuth } from "google-auth-library";

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

    console.log("🌐 Remote canvas extension service called with:", {
      imageUrl: imageUrl.substring(0, 100) + "...",
      desiredHeight,
      paddingPct,
      whiteThresh,
      uploadToCloudflare,
    });

    // Validate input parameters
    if (!imageUrl || !desiredHeight) {
      console.error("❌ Missing required parameters");
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    if (desiredHeight < 100 || desiredHeight > 5000) {
      console.error("❌ Invalid desired height:", desiredHeight);
      return NextResponse.json(
        { error: "Desired height must be between 100 and 5000 pixels" },
        { status: 400 }
      );
    }

    if (paddingPct < 0 || paddingPct > 1) {
      console.error("❌ Invalid padding percentage:", paddingPct);
      return NextResponse.json(
        { error: "Padding percentage must be between 0 and 1" },
        { status: 400 }
      );
    }

    if (whiteThresh !== -1 && (whiteThresh < 0 || whiteThresh > 255)) {
      console.error("❌ Invalid white threshold:", whiteThresh);
      return NextResponse.json(
        { error: "White threshold must be -1 or between 0 and 255" },
        { status: 400 }
      );
    }

    // Get the remote service URL from environment variables
    const remoteServiceUrl = process.env.CANVAS_EXTENSION_SERVICE_URL;
    console.log("🔧 Remote service URL:", remoteServiceUrl);

    if (!remoteServiceUrl) {
      console.error("❌ CANVAS_EXTENSION_SERVICE_URL not configured");
      return NextResponse.json(
        {
          error: "Canvas extension service not configured",
          details: "CANVAS_EXTENSION_SERVICE_URL environment variable not set",
        },
        { status: 503 }
      );
    }

    try {
      // Call the remote canvas extension service with authentication
      console.log("🚀 Calling remote canvas extension service...");

      // Get an identity token for the service
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Try to get an identity token for authentication
      try {
        console.log("🔐 Attempting to get Google Cloud identity token...");

        // Use the default service account in the Vercel environment
        // This will work when deployed to Vercel with proper Google Cloud credentials
        const auth = new GoogleAuth({
          scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });

        // Get an identity token specifically for the target audience
        const client = await auth.getIdTokenClient(remoteServiceUrl);
        const idToken =
          await client.idTokenProvider.fetchIdToken(remoteServiceUrl);

        if (idToken) {
          headers["Authorization"] = `Bearer ${idToken}`;
          console.log("✅ Successfully obtained Google Cloud identity token");
          console.log("🔑 Token length:", idToken.length);
          console.log("🔑 Token preview:", idToken.substring(0, 50) + "...");
        } else {
          throw new Error("No identity token received");
        }
      } catch (authError) {
        console.error("⚠️ Could not get identity token:", authError);
        console.log("🔄 Proceeding without authentication...");

        // For development/testing, try without auth first
        // In production, this should fail gracefully
        if (process.env.NODE_ENV === "production") {
          throw new Error(
            "Authentication required for production Cloud Run access"
          );
        }
      }

      console.log("📡 Making request to:", `${remoteServiceUrl}/extend-canvas`);
      console.log("📋 Request headers:", Object.keys(headers));

      const requestPayload = {
        imageUrl,
        desiredHeight,
        paddingPct,
        whiteThresh,
      };
      console.log("📦 Request payload:", {
        ...requestPayload,
        imageUrl: imageUrl.substring(0, 100) + "...",
      });

      const remoteResponse = await fetch(`${remoteServiceUrl}/extend-canvas`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
        // 60 second timeout for remote service
        signal: AbortSignal.timeout(60000),
      });

      console.log("📨 Response status:", remoteResponse.status);
      console.log(
        "📨 Response headers:",
        Object.fromEntries(remoteResponse.headers.entries())
      );

      if (!remoteResponse.ok) {
        const errorText = await remoteResponse.text();
        console.error("❌ Remote service error response:", {
          status: remoteResponse.status,
          statusText: remoteResponse.statusText,
          body: errorText.substring(0, 500),
        });
        throw new Error(
          `Remote service error: ${remoteResponse.status} ${errorText}`
        );
      }

      console.log("✅ Remote service responded successfully");
      const remoteResult = await remoteResponse.json();
      console.log("📄 Remote result keys:", Object.keys(remoteResult));

      if (!remoteResult.success) {
        console.error("❌ Remote processing failed:", remoteResult.error);
        throw new Error(
          `Remote processing failed: ${remoteResult.error || "Unknown error"}`
        );
      }

      console.log("🎉 Remote processing successful!");
      let result: any = {
        success: true,
        processedImageUrl: remoteResult.processedImageUrl,
        message: "Image processed successfully with remote C++ OpenCV service",
        remoteService: true,
      };

      // Handle Cloudflare upload if requested
      if (uploadToCloudflare && remoteResult.processedImageUrl) {
        try {
          // Validate Cloudflare environment variables
          if (
            !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
            !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
          ) {
            throw new Error("Cloudflare credentials not configured");
          }

          // Convert base64 data URL to buffer
          const base64Data = remoteResult.processedImageUrl.replace(
            /^data:image\/jpeg;base64,/,
            ""
          );
          const imageBuffer = Buffer.from(base64Data, "base64");

          // Create filename for the processed image
          const baseFilename = originalFilename || "image";
          const nameWithoutExt = baseFilename.replace(/\.[^/.]+$/, "");
          const processedFilename = `${nameWithoutExt}_extended_${desiredHeight}px_remote.jpg`;

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
              processing: "canvas_extension_remote",
              originalImage: imageUrl,
              parameters: {
                desiredHeight,
                paddingPct,
                whiteThresh,
              },
              processedAt: now,
            },
            carId: originalCarId || "",
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

      return NextResponse.json(result);
    } catch (remoteError) {
      console.error("Remote canvas extension service error:", remoteError);

      if (remoteError instanceof Error && remoteError.name === "AbortError") {
        return NextResponse.json(
          { error: "Remote service timeout" },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          error: "Remote canvas extension service unavailable",
          details:
            remoteError instanceof Error
              ? remoteError.message
              : "Unknown error",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Canvas extension (remote) error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
