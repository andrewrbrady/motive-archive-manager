import { NextRequest, NextResponse } from "next/server";

// Set maximum execution time to 60 seconds
export const maxDuration = 60;
export const runtime = "nodejs";

// Ensure environment variables are set
if (
  !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
) {
  throw new Error("Cloudflare credentials not set in environment variables");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("requireSignedURLs", "false");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      return NextResponse.json(
        { error: `Failed to upload to Cloudflare: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Cloudflare API error:", result.errors);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Unknown Cloudflare error" },
        { status: 400 }
      );
    }

    const imageUrl = result.result.variants[0].replace(/\/public$/, "");

    // Return the image URL
    return NextResponse.json({
      success: true,
      imageId: result.result.id,
      imageUrl,
    });
  } catch (error) {
    console.error("Error uploading to Cloudflare Images:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
