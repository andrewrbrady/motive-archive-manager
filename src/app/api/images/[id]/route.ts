import { MongoClient, ObjectId } from "mongodb";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFormattedImageUrl } from "@/lib/cloudflare";
import { createStaticResponse } from "@/lib/cache-utils";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Helper function to get MongoDB client
async function getMongoClient() {
  try {
    const client = new MongoClient(MONGODB_URI as string, {
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

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

    // Return the Cloudflare image URL in a JSON response
    const imageUrl = getFormattedImageUrl(image.url);
    return NextResponse.json({
      _id: image._id.toString(),
      cloudflareId: image.cloudflareId,
      url: imageUrl,
      filename: image.filename,
      metadata: image.metadata,
      carId: image.carId.toString(),
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
      category: determineImageCategory(image),
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
