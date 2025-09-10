import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  let client;
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "No image IDs provided" },
        { status: 400 }
      );
    }

    // Sanitize and validate IDs before converting to ObjectId
    const rawIds = ids
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    const validIds = rawIds.filter((id) => ObjectId.isValid(id));

    // If no valid IDs after validation, return empty result (graceful handling)
    if (validIds.length === 0) {
      return NextResponse.json([]);
    }

    const imageIds = validIds.map((id) => new ObjectId(id));

    client = await MongoClient.connect(MONGODB_URI as string);
    const db = client.db(DB_NAME);
    const collection: Collection<Image> = db.collection("images");

    const images = await collection.find({ _id: { $in: imageIds } }).toArray();

    // Transform the response to match the expected format
    const metadata = images.map((image) => ({
      imageId: image._id.toString(),
      cloudflareId: image.cloudflareId,
      metadata: image.metadata,
      url: image.url,
      filename: image.filename,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    }));

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error fetching image metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
