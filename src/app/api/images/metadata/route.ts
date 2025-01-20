import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
const dbName = "motive_archive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client = new MongoClient(uri);
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "No image IDs provided" },
        { status: 400 }
      );
    }

    const imageIds = ids.split(",");

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("image_metadata");

    const metadata = await collection
      .find({ imageId: { $in: imageIds } })
      .toArray();

    return NextResponse.json(metadata);
  } catch (error) {
    console.error("Error fetching image metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
