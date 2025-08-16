import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Set execution time limits similar to the Cloudflare route
export const maxDuration = 300;
export const runtime = "nodejs";

// Force dynamic rendering for uploads
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] Images upload called at", new Date().toISOString());

  try {
    // Log request details
    console.log(
      "[API] Request headers:",
      Object.fromEntries(request.headers.entries())
    );
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] Request URL:", request.url);

    const formData = await request.formData();
    const files = formData.getAll("files");

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] FormData parsed, files count:", files.length);

    // Get car association and metadata from FormData
    const carId = formData.get("carId") as string;
    const metadataString = formData.get("metadata") as string;
    let customMetadata = {};

    if (metadataString) {
      try {
        customMetadata = JSON.parse(metadataString);
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] Custom metadata parsed:", customMetadata);
      } catch (e) {
        console.warn("[API] Failed to parse metadata:", e);
      }
    }

    if (carId) {
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] Car association found:", carId);
    }

    if (!files || files.length === 0) {
      console.error("[API] No files provided in request");
      return NextResponse.json(
        {
          error: "No files provided",
          details: "The request did not contain any files to upload",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Processing ${files.length} files for upload`);

    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID) {
      console.error("[API] Missing CLOUDFLARE_ACCOUNT_ID environment variable");
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Missing Cloudflare account ID",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN) {
      console.error("[API] Missing CLOUDFLARE_API_TOKEN environment variable");
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Missing Cloudflare API token",
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    const uploadedImages = [];
    const uploadErrors = [];
    const now = new Date().toISOString();

    for (let i = 0; i < files.length; i++) {
      const fileData = files[i];
      // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Processing file ${i + 1}/${files.length}`);

      if (!(fileData instanceof File)) {
        const error = `File ${i + 1} is not a valid File object`;
        console.error("[API]", error);
        uploadErrors.push({
          fileIndex: i + 1,
          error,
          details: "Invalid file data received",
        });
        continue;
      }

      const file = fileData as File;
      console.log(`[API] File ${i + 1} details:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      });

      // Validate file
      if (file.size === 0) {
        const error = `File "${file.name}" is empty (0 bytes)`;
        console.error("[API]", error);
        uploadErrors.push({
          fileName: file.name,
          fileIndex: i + 1,
          error,
          details: "File has no content",
        });
        continue;
      }

      // More lenient file size check - 8MB per file for better user experience
      if (file.size > 8 * 1024 * 1024) {
        const error = `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
        console.error("[API]", error);
        uploadErrors.push({
          fileName: file.name,
          fileIndex: i + 1,
          error,
          details:
            "File exceeds 8MB limit. Please compress your image before uploading.",
        });
        continue;
      }

      // Check total request size for multiple files
      const totalSize = files.reduce((acc: number, f: any) => {
        if (f instanceof File) return acc + f.size;
        return acc;
      }, 0);

      if (totalSize > 25 * 1024 * 1024) {
        const error = `Total upload size too large (${(totalSize / 1024 / 1024).toFixed(1)}MB)`;
        console.error("[API]", error);
        return NextResponse.json(
          {
            error: "Upload too large",
            details:
              "Total upload size exceeds 25MB. Please upload fewer images at once or compress them.",
            totalSize: `${(totalSize / 1024 / 1024).toFixed(1)}MB`,
            timestamp: new Date().toISOString(),
          },
          { status: 413 }
        );
      }

      try {
        // Create a new FormData for Cloudflare upload
        const cloudflareForm = new FormData();
        cloudflareForm.append("file", file);

        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Uploading "${file.name}" to Cloudflare...`);

        // Upload to Cloudflare Images
        const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`;
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] Cloudflare URL:", cloudflareUrl);

        const response = await fetch(cloudflareUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          },
          body: cloudflareForm,
        });

        console.log(
          `[API] Cloudflare response status for "${file.name}":`,
          response.status
        );
        console.log(
          `[API] Cloudflare response headers:`,
          Object.fromEntries(response.headers.entries())
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[API] Cloudflare upload error for "${file.name}":`, {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
          });

          uploadErrors.push({
            fileName: file.name,
            fileIndex: i + 1,
            error: `Cloudflare upload failed (${response.status})`,
            details: errorText,
            cloudflareStatus: response.status,
          });
          continue;
        }

        const result = await response.json();
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Cloudflare response for "${file.name}":`, result);

        if (!result.success) {
          console.error(
            `[API] Cloudflare upload failed for "${file.name}":`,
            result.errors
          );
          uploadErrors.push({
            fileName: file.name,
            fileIndex: i + 1,
            error: "Cloudflare upload failed",
            details: JSON.stringify(result.errors),
            cloudflareErrors: result.errors,
          });
          continue;
        }

        // Build base URL (no variant) to avoid stacking variants (e.g., /square/public)
        const imageUrl = `https://imagedelivery.net/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/${result.result.id}`;
        // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Image URL for "${file.name}":`, imageUrl);

        // Create metadata - use custom metadata if provided, otherwise default
        const metadata =
          Object.keys(customMetadata).length > 0
            ? customMetadata
            : {
                category: "unclassified",
                angle: "unknown",
                movement: "unknown",
                tod: "unknown",
                view: "unknown",
              };

        try {
          // Store in MongoDB
          // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log(`[API] Storing "${file.name}" in MongoDB...`);
          const db = await getDatabase();
          const imageDoc = {
            _id: new ObjectId(),
            cloudflareId: result.result.id,
            url: imageUrl,
            filename: file.name,
            metadata,
            carId: carId ? new ObjectId(carId) : null,
            createdAt: now,
            updatedAt: now,
          };

          await db.collection("images").insertOne(imageDoc);
          console.log(
            `[API] Successfully stored "${file.name}" in MongoDB with ID:`,
            imageDoc._id.toString()
          );

          // If this processed image is associated with a car, add it to the car's processedImageIds array
          if (carId && (metadata as any).category === "processed") {
            try {
              await db.collection("cars").updateOne(
                { _id: new ObjectId(carId) },
                {
                  $addToSet: { processedImageIds: imageDoc._id },
                  $set: { updatedAt: now },
                }
              );
              console.log(
                `[API] Added processed image ${imageDoc._id} to car ${carId}`
              );
            } catch (carUpdateError) {
              console.error(
                "[API] Failed to update car with processed image:",
                carUpdateError
              );
              // Don't fail the whole operation if car update fails
            }
          }

          uploadedImages.push({
            id: imageDoc._id.toString(),
            cloudflareId: result.result.id,
            filename: file.name,
            url: imageUrl,
            metadata,
            carId: carId || null,
          });
        } catch (dbError) {
          console.error(`[API] MongoDB error for "${file.name}":`, dbError);
          uploadErrors.push({
            fileName: file.name,
            fileIndex: i + 1,
            error: "Database storage failed",
            details:
              dbError instanceof Error
                ? dbError.message
                : "Unknown database error",
            stage: "mongodb",
          });
        }
      } catch (fileError) {
        console.error(
          `[API] Unexpected error processing "${file.name}":`,
          fileError
        );
        uploadErrors.push({
          fileName: file.name,
          fileIndex: i + 1,
          error: "Unexpected processing error",
          details:
            fileError instanceof Error ? fileError.message : "Unknown error",
          stage: "processing",
        });
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[API] Upload completed in ${duration}ms:`, {
      totalFiles: files.length,
      successful: uploadedImages.length,
      failed: uploadErrors.length,
      duration: `${duration}ms`,
    });

    // Return response with detailed information
    const response = {
      success: uploadedImages.length > 0,
      images: uploadedImages,
      errors: uploadErrors,
      summary: {
        total: files.length,
        successful: uploadedImages.length,
        failed: uploadErrors.length,
        duration: `${duration}ms`,
      },
      timestamp: new Date().toISOString(),
    };

    // If all uploads failed, return 500 status
    if (uploadedImages.length === 0 && uploadErrors.length > 0) {
      console.error("[API] All uploads failed");
      return NextResponse.json(response, { status: 500 });
    }

    // If some uploads failed, return 207 (Multi-Status)
    if (uploadErrors.length > 0) {
      console.warn("[API] Some uploads failed");
      return NextResponse.json(response, { status: 207 });
    }

    // All successful
    // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] All uploads successful");
    return NextResponse.json(response);
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error("[API] Critical error in upload handler:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Critical server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] // [REMOVED] console.log("[API] OPTIONS request received for images upload");
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
