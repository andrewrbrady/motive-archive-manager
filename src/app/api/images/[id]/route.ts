import { MongoClient, ObjectId } from "mongodb";
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
  const client = new MongoClient(MONGODB_URI as string, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  return client;
}

// GET image by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);

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

    // Process URL to ensure it works with Cloudflare
    const processedImage = {
      ...image,
      _id: image._id.toString(),
      carId: image.carId ? image.carId.toString() : null,
      url: getFormattedImageUrl(image.url),
      // Add metadata.category if not present but can be derived from old structure
      metadata: {
        ...image.metadata,
        category: image.metadata?.category || determineImageCategory(image),
      },
    };

    console.log(`Found image: ${id}, URL: ${processedImage.url}`);

    // Return with appropriate cache headers - images are static and can be cached longer
    return createStaticResponse(processedImage);
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
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
function determineImageCategory(image: any): string | undefined {
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
