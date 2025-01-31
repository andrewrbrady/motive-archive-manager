import { NextRequest, NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

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
  let dbConnection;
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return NextResponse.json(
        { error: "No image IDs provided" },
        { status: 400 }
      );
    }

    const imageIds = ids.split(",").map((id) => new ObjectId(id));

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const imagesCollection: Collection<Image> = db.collection("images");

    const images = await imagesCollection
      .find({ _id: { $in: imageIds } })
      .toArray();

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
  }
}
