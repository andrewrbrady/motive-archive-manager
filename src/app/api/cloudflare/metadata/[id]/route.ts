import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env");
}

type Props = {
  params: Promise<{ id: string }>;
};

interface ImageMetadata {
  angle?: string;
  view?: string;
  tod?: string;
  movement?: string;
  description?: string;
  [key: string]: string | undefined;
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI as string);
  await client.connect();
  return client;
}

export async function GET(request: NextRequest, { params }: Props) {
  let client;
  try {
    const { id } = await params;

    client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection: Collection<Image> = db.collection("images");

    // Find the image directly in the images collection
    const image = await collection.findOne({ cloudflareId: id });

    if (!image) {
      return NextResponse.json(
        { error: "Image metadata not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      result: {
        id: image.cloudflareId,
        filename: image.filename,
        meta: image.metadata,
        uploaded: image.createdAt,
        variants: [image.url],
      },
      success: true,
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
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

export async function PATCH(request: NextRequest, { params }: Props) {
  let client;
  try {
    const { id } = await params;
    const body = await request.json();

    client = await getMongoClient();
    const db = client.db(DB_NAME);
    const collection: Collection<Image> = db.collection("images");

    // Update the metadata in MongoDB
    const result = await collection.updateOne(
      { cloudflareId: id },
      {
        $set: {
          metadata: body.metadata,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Get the updated image data
    const image = await collection.findOne({ cloudflareId: id });

    if (!image) {
      return NextResponse.json(
        { error: "Failed to fetch updated image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      result: {
        id: image.cloudflareId,
        filename: image.filename,
        meta: image.metadata,
        uploaded: image.createdAt,
        variants: [image.url],
      },
      success: true,
    });
  } catch (error) {
    console.error("Error updating metadata:", error);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
