import { NextRequest, NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

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

export async function GET(request: NextRequest, { params }: Props) {
  let dbConnection;
  try {
    const { id } = await params;

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const imagesCollection: Collection<Image> = db.collection("images");

    // Find the image directly in the images collection
    const image = await imagesCollection.findOne({ cloudflareId: id });

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
  }
}

export async function PATCH(request: NextRequest, { params }: Props) {
  let dbConnection;
  try {
    const { id } = await params;
    const body = await request.json();

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const imagesCollection: Collection<Image> = db.collection("images");

    const result = await imagesCollection.findOneAndUpdate(
      { cloudflareId: id },
      {
        $set: {
          metadata: body.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Image metadata not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      result: {
        id: result.cloudflareId,
        filename: result.filename,
        meta: result.metadata,
        uploaded: result.createdAt,
        variants: [result.url],
      },
      success: true,
    });
  } catch (error) {
    console.error("Error updating metadata:", error);
    return NextResponse.json(
      { error: "Failed to update metadata" },
      { status: 500 }
    );
  }
}
