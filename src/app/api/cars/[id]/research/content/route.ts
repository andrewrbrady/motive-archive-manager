import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedDownloadUrl } from "@/lib/s3";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Needed for streaming response

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

    const { db } = await connectToDatabase();

    // Use projection to only get the s3Key and cache key fields
    const file = await db
      .collection("research_files")
      .findOne(
        { _id: new ObjectId(fileId) },
        { projection: { s3Key: 1, updatedAt: 1 } }
      );

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Generate ETag for caching
    const etag = `"${file._id}-${file.updatedAt?.getTime() || Date.now()}"`;
    const ifNoneMatch = request.headers.get("if-none-match");

    // Check if client's cached version is still valid
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const url = await generatePresignedDownloadUrl(file.s3Key);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }

    // Create a TransformStream to handle the response
    const { readable, writable } = new TransformStream();
    response.body?.pipeTo(writable);

    return new Response(readable, {
      headers: {
        "Content-Type": "text/markdown",
        "Cache-Control": "public, max-age=3600",
        ETag: etag,
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
