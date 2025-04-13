import { ObjectId } from "mongodb";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { createStaticResponse } from "@/lib/cache-utils";
import { getMongoClient } from "@/lib/mongodb";

const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// GET image by ID
export async function GET(request: Request) {
  let client;
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid image ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Fetching image with ID: ${id}`);

    // Find the image in the database
    const image = await db.collection("images").findOne({ _id: objectId });

    if (!image) {
      console.log(`Image not found: ${id}`);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Format the image URL with appropriate variant based on metadata
    const variant = determineImageVariant(image);
    const imageUrl = getFormattedImageUrl(image.url, variant);

    // Return the formatted response with cache headers
    return createStaticResponse({
      id: image._id.toString(),
      cloudflareId: image.cloudflareId,
      url: imageUrl,
      filename: image.filename,
      metadata: image.metadata || {},
      carId: image.carId.toString(),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      category: determineImageCategory(image),
      variant,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Helper function to determine image variant based on metadata and context
 */
function determineImageVariant(image: any): string {
  const metadata = image.metadata || {};

  // Use thumbnail for small preview images
  if (metadata.isPreview || metadata.isThumbnail) {
    return "thumbnail";
  }

  // Use medium for gallery views
  if (metadata.isGallery) {
    return "medium";
  }

  // Default to public variant for full-size images
  return "public";
}

/**
 * Helper function to determine image category from metadata
 * Used for backward compatibility with older image data
 */
function determineImageCategory(image: any): string {
  const metadata = image.metadata || {};

  // Check for explicit view fields
  if (metadata.view === "exterior" || metadata.angle) {
    return "exterior";
  }

  if (metadata.view === "interior") {
    return "interior";
  }

  if (metadata.view === "engine" || metadata.angle === "engine bay") {
    return "engine";
  }

  if (
    metadata.view === "damage" ||
    metadata.description?.toLowerCase().includes("damage")
  ) {
    return "damage";
  }

  if (
    metadata.view === "documents" ||
    metadata.description?.toLowerCase().includes("document") ||
    image.filename?.toLowerCase().includes("document")
  ) {
    return "documents";
  }

  // Check filename patterns as last resort
  const filename = image.filename?.toLowerCase() || "";

  if (filename.includes("interior")) return "interior";
  if (filename.includes("engine")) return "engine";
  if (filename.includes("damage")) return "damage";
  if (filename.includes("doc")) return "documents";
  if (filename.includes("ext") || filename.match(/front|rear|side|profile/))
    return "exterior";

  // Default to 'other' if we can't determine
  return "other";
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
