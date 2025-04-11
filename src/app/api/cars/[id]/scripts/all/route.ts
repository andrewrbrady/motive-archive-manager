import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { deleteResearchFile } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/scripts/all

    const db = await getDatabase();

    // Get all script files for this car
    const files = await db
      .collection("script_files")
      .find({ carId: new ObjectId(id) })
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
    await db.collection("script_files").deleteMany({ carId: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting all script files:", error);
    return NextResponse.json(
      { error: "Failed to delete all files" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
