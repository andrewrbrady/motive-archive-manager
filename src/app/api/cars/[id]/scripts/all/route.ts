import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { deleteResearchFile } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function DELETE(
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

    // Delete files from S3
    await Promise.all(
      files.map(async (file) => {
        if (file.s3Key) {
          try {
            await deleteResearchFile(file.s3Key);
          } catch (error) {
            console.error(
              `Failed to delete file from S3: ${file.s3Key}`,
              error
            );
          }
        }
      })
    );

    // Delete all files from MongoDB
    await db
      .collection("script_files")
      .deleteMany({ carId: new ObjectId(params.id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting all script files:", error);
    return NextResponse.json(
      { error: "Failed to delete all files" },
      { status: 500 }
    );
  }
}
