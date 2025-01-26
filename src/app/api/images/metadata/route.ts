import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const dbName = "motive_archive";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const client = await clientPromise;
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
  }
}
