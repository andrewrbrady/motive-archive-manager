import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedDownloadUrl } from "@/lib/s3";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const carId = params.id;

    if (!fileId || !carId) {
      return NextResponse.json(
        { error: "File ID and Car ID are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId), carId });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(file.content, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Error fetching file content:", error);
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const { fileId, content } = await request.json();

    if (!fileId || !carId || content === undefined) {
      return NextResponse.json(
        { error: "File ID, Car ID, and content are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Update the file content
    const result = await db.collection("research_files").updateOne(
      { _id: new ObjectId(fileId), carId },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating file content:", error);
    return NextResponse.json(
      { error: "Failed to update file content" },
      { status: 500 }
    );
  }
}
