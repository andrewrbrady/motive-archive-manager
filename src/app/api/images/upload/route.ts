import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Set execution time limits similar to the Cloudflare route
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log("[API] Images upload called at", new Date().toISOString());

  try {
    // Log request details
    console.log(
      "[API] Request headers:",
      Object.fromEntries(request.headers.entries())
    );
    console.log("[API] Request URL:", request.url);

    const formData = await request.formData();
    const files = formData.getAll("files");

    console.log("[API] FormData parsed, files count:", files.length);

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

    console.log(`[API] Processing ${files.length} files for upload`);

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
      console.log(`[API] Processing file ${i + 1}/${files.length}`);

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

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        const error = `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
        console.error("[API]", error);
        uploadErrors.push({
          fileName: file.name,
          fileIndex: i + 1,
          error,
          details: "File exceeds 10MB limit",
        });
        continue;
      }

      try {
        // Create a new FormData for Cloudflare upload
        const cloudflareForm = new FormData();
        cloudflareForm.append("file", file);

        console.log(`[API] Uploading "${file.name}" to Cloudflare...`);

        // Upload to Cloudflare Images
        const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`;
        console.log("[API] Cloudflare URL:", cloudflareUrl);

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
        console.log(`[API] Cloudflare response for "${file.name}":`, result);

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

        // Get image URL from variants
        const imageUrl = result.result.variants[0].replace(/\/public$/, "");
        console.log(`[API] Image URL for "${file.name}":`, imageUrl);

        // Create basic metadata
        const metadata = {
          category: "unclassified",
          angle: "unknown",
          movement: "unknown",
          tod: "unknown",
          view: "unknown",
        };

        try {
          // Store in MongoDB
          console.log(`[API] Storing "${file.name}" in MongoDB...`);
          const db = await getDatabase();
          const imageDoc = {
            _id: new ObjectId(),
            cloudflareId: result.result.id,
            url: imageUrl,
            filename: file.name,
            metadata,
            createdAt: now,
            updatedAt: now,
          };

          await db.collection("images").insertOne(imageDoc);
          console.log(
            `[API] Successfully stored "${file.name}" in MongoDB with ID:`,
            imageDoc._id.toString()
          );

          uploadedImages.push({
            id: imageDoc._id.toString(),
            cloudflareId: result.result.id,
            filename: file.name,
            url: imageUrl,
            metadata,
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
    console.log("[API] All uploads successful");
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
  console.log("[API] OPTIONS request received for images upload");
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
