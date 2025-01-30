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

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Get the file from MongoDB
    const { db } = await connectToDatabase();
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Get the S3 URL
    const url = await generatePresignedDownloadUrl(file.s3Key);

    // Fetch the content
    const response = await fetch(url);
    const content = await response.text();

    // Return the content with appropriate headers
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown",
        "Cache-Control": "s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching file content:", error);
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}
