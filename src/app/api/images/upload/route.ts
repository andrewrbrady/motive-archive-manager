import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Set execution time limits similar to the Cloudflare route
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("[API] Images upload called");

  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    console.log(`Processing ${files.length} files for upload`);

    const uploadedImages = [];
    const now = new Date().toISOString();

    for (const fileData of files) {
      if (!(fileData instanceof File)) {
        console.error("Invalid file data received");
        continue;
      }

      const file = fileData as File;

      // Create a new FormData for Cloudflare upload
      const cloudflareForm = new FormData();
      cloudflareForm.append("file", file);

      // Upload to Cloudflare Images
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
          },
          body: cloudflareForm,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Cloudflare upload error:", error);
        throw new Error("Failed to upload to Cloudflare");
      }

      const result = await response.json();

      if (!result.success) {
        console.error("Cloudflare upload failed:", result.errors);
        throw new Error("Failed to upload to Cloudflare");
      }

      // Get image URL from variants
      const imageUrl = result.result.variants[0].replace(/\/public$/, "");

      // Create basic metadata
      const metadata = {
        category: "unclassified",
        angle: "unknown",
        movement: "unknown",
        tod: "unknown",
        view: "unknown",
      };

      // Store in MongoDB
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

      uploadedImages.push({
        id: imageDoc._id.toString(),
        cloudflareId: result.result.id,
        filename: file.name,
        url: imageUrl,
        metadata,
      });
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
    });
  } catch (error) {
    console.error("Error uploading images:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
