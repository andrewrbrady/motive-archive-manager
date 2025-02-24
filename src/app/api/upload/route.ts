import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Cloudflare Images
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Cloudflare upload error:", error);
      throw new Error("Failed to upload to Cloudflare");
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Cloudflare upload failed:", result.errors);
      throw new Error("Failed to upload to Cloudflare");
    }

    return NextResponse.json({
      id: result.result.id,
      filename: result.result.filename,
      uploaded: result.result.uploaded,
      requireSignedURLs: result.result.requireSignedURLs,
      variants: ["public", "thumbnail"],
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
