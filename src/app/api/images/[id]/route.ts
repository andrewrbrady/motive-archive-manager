import { ObjectId } from "mongodb";
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

import { NextResponse } from "next/server";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { createStaticResponse } from "@/lib/cache-utils";
import { getMongoClient, getDatabase } from "@/lib/mongodb";

const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// GET image by ID
export async function GET(request: Request) {
  let client;
  let id = ""; // Define id at the top level so it's accessible in catch block
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    id = segments[segments.length - 1];

    // [REMOVED] // [REMOVED] console.log(`[Image API] GET request for image ID: ${id}`);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      console.warn(`[Image API] Invalid image ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid image ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    // Try to use getDatabase first for pool connection
    let db;
    try {
      // [REMOVED] // [REMOVED] console.log(`[Image API] Connecting to database using getDatabase()`);
      db = await getDatabase();
    } catch (dbError) {
      console.error(
        `[Image API] getDatabase failed, falling back to getMongoClient: ${dbError}`
      );
      client = await getMongoClient();
      db = client.db(DB_NAME);
    }

    // [REMOVED] // [REMOVED] console.log(`[Image API] Fetching image with ID: ${id}`);

    // Find the image in the database
    const image = await db.collection("images").findOne({ _id: objectId });

    if (!image) {
      // [REMOVED] // [REMOVED] console.log(`[Image API] Image not found with ID: ${id}`);

      // Try finding by cloudflareId as fallback
      // [REMOVED] // [REMOVED] console.log(`[Image API] Trying to find image by cloudflareId: ${id}`);
      const imageByCloudflareId = await db.collection("images").findOne({
        cloudflareId: id,
      });

      if (imageByCloudflareId) {
        // [REMOVED] // [REMOVED] console.log(`[Image API] Found image by cloudflareId: ${id}`);

        // Format the image URL with appropriate variant based on metadata
        const variant = determineImageVariant(imageByCloudflareId);
        const imageUrl = getFormattedImageUrl(imageByCloudflareId.url, variant);

        // Return the formatted response with cache headers
        return createStaticResponse({
          id: imageByCloudflareId._id.toString(),
          _id: imageByCloudflareId._id.toString(),
          cloudflareId: imageByCloudflareId.cloudflareId,
          url: imageUrl,
          filename: imageByCloudflareId.filename,
          metadata: imageByCloudflareId.metadata || {},
          carId: imageByCloudflareId.carId.toString(),
          createdAt: imageByCloudflareId.createdAt,
          updatedAt: imageByCloudflareId.updatedAt,
          category: determineImageCategory(imageByCloudflareId),
          variant,
        });
      }

      // If ID is a valid cloudflare format (GUID-like string), generate a direct URL
      if (id.match(/^[a-f0-9-]{36}$/i)) {
        console.log(
          `[Image API] Creating synthetic image record for cloudflare ID: ${id}`
        );
        const now = new Date().toISOString();
        const syntheticImage = {
          _id: objectId.toString(),
          id: objectId.toString(),
          cloudflareId: id,
          url: `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${id}/public`,
          filename: `Image ${id.substring(0, 8)}`,
          metadata: {},
          createdAt: now,
          updatedAt: now,
          category: "unknown",
          variant: "public",
        };

        return NextResponse.json(syntheticImage);
      }

      return NextResponse.json(
        {
          error: "Image not found",
          id: id,
          _id: id,
        },
        { status: 404 }
      );
    }

    // Format the image URL with appropriate variant based on metadata
    const variant = determineImageVariant(image);
    let imageUrl;

    try {
      imageUrl = getFormattedImageUrl(image.url, variant);
      // [REMOVED] // [REMOVED] console.log(`[Image API] Formatted URL for image ${id}: ${imageUrl}`);
    } catch (urlError) {
      console.error(`[Image API] Error formatting URL: ${urlError}`);
      imageUrl =
        image.url ||
        `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${
          image.cloudflareId || id
        }/public`;
    }

    if (!imageUrl || imageUrl === "") {
      console.error(
        `[Image API] Empty URL for image ${id}, reconstructing from cloudflareId`
      );
      // If URL is empty, try to reconstruct it from cloudflareId
      if (image.cloudflareId) {
        imageUrl = `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${image.cloudflareId}/public`;
      } else {
        // Last resort fallback
        imageUrl = "https://placehold.co/600x400?text=Image+Not+Available";
      }
    }

    // Return the formatted response with cache headers
    const response = {
      id: image._id.toString(),
      _id: image._id.toString(),
      cloudflareId: image.cloudflareId,
      url: imageUrl,
      filename: image.filename,
      metadata: image.metadata || {},
      carId: image.carId.toString(),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      category: determineImageCategory(image),
      variant,
    };

    // [REMOVED] // [REMOVED] console.log(`[Image API] Successfully returning image data for ${id}`);
    return createStaticResponse(response);
  } catch (error) {
    console.error(`[Image API] Error processing image ${id}:`, error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
        errorType: error?.constructor?.name,
        id: id,
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error(`[Image API] Error closing client:`, closeError);
      }
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
 */
function determineImageCategory(image: any): string {
  const metadata = image.metadata || {};

  if (metadata.category) {
    return metadata.category;
  }

  // Try to infer category from other metadata
  if (metadata.view === "interior" || metadata.side === "interior") {
    return "interior";
  }

  if (metadata.movement === "driving" || metadata.movement === "moving") {
    return "action";
  }

  // Default to exterior
  return "exterior";
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
