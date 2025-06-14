import { NextRequest, NextResponse } from "next/server";

// Set maximum execution time
export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// File size limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Cloudflare Images limit)
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "image/svg+xml",
];

interface DirectUploadResponse {
  success: boolean;
  uploadURL?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<DirectUploadResponse>> {
  try {
    console.log("=== CLOUDFLARE DIRECT UPLOAD URL GENERATION ===");

    const body = await request.json();
    const { fileName, fileSize, fileType, carId } = body;

    // Validate inputs
    if (!fileName || !fileSize || !fileType || !carId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fileName, fileSize, fileType, carId",
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type "${fileType}". Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size ${(fileSize / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    console.log(
      `Generating direct upload URL for: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`
    );

    // Create metadata for the upload
    const metadata = {
      carId,
      originalFileName: fileName,
      uploadedAt: new Date().toISOString(),
      source: "direct-upload",
    };

    // Generate direct upload URL from Cloudflare
    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v2/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requireSignedURLs: false,
          metadata,
          expiry: new Date(Date.now() + 3600000).toISOString(), // 1 hour expiry
        }),
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(
        "Cloudflare direct upload URL generation failed:",
        errorText
      );
      return NextResponse.json(
        {
          success: false,
          error: `Failed to generate upload URL: ${uploadResponse.statusText}`,
        },
        { status: 500 }
      );
    }

    const result = await uploadResponse.json();

    if (!result.success) {
      console.error("Cloudflare API error:", result.errors);
      return NextResponse.json(
        {
          success: false,
          error: `Cloudflare API error: ${result.errors[0]?.message || "Unknown error"}`,
        },
        { status: 500 }
      );
    }

    console.log("Direct upload URL generated successfully");

    return NextResponse.json({
      success: true,
      uploadURL: result.result.uploadURL,
    });
  } catch (error) {
    console.error("Error generating direct upload URL:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
