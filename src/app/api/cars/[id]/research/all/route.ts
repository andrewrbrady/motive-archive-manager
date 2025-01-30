import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { deleteFile } from "@/lib/s3";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await connectToDatabase();

    // Get all research files for this car
    const files = await db
      .collection("research_files")
      .find({ carId: params.id })
      .toArray();

    // Delete all files from S3
    const deletePromises = files.map(async (file) => {
      try {
        await deleteFile(file.s3Key);
      } catch (error) {
        console.error(`Failed to delete file ${file.s3Key} from S3:`, error);
      }
    });

    await Promise.all(deletePromises);

    // Delete all files from MongoDB
    await db.collection("research_files").deleteMany({ carId: params.id });

    return NextResponse.json({ message: "All files deleted successfully" });
  } catch (error) {
    console.error("Error deleting all files:", error);
    return NextResponse.json(
      { error: "Failed to delete all files" },
      { status: 500 }
    );
  }
}
