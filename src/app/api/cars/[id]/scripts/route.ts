import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();

    // Get all script files for this car
    const files = await db
      .collection("script_files")
      .find({ carId: new ObjectId(params.id) })
      .toArray();

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          if (!file.s3Key) {
            return {
              ...file,
              _id: file._id.toString(),
              url: null,
              error: "Missing S3 key",
            };
          }

          const url = await generatePresignedDownloadUrl(file.s3Key);

          return {
            ...file,
            _id: file._id.toString(),
            url,
          };
        } catch (error) {
          return {
            ...file,
            _id: file._id.toString(),
            url: null,
            error:
              error instanceof Error ? error.message : "Failed to generate URL",
          };
        }
      })
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (error) {
    console.error("Error fetching script files:", error);
    return NextResponse.json(
      { error: "Failed to fetch script files" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const db = await getDatabase();

    // Delete the file from MongoDB
    const result = await db
      .collection("script_files")
      .deleteOne({ _id: new ObjectId(fileId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting script file:", error);
    return NextResponse.json(
      { error: "Failed to delete script file" },
      { status: 500 }
    );
  }
}
