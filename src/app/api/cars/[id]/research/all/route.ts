import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { deleteFile } from "@/lib/s3";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const carId = segments[segments.length - 3]; // -3 because URL is /cars/[id]/research/all

    const db = await getDatabase();

    // Get all research files for this car
    const files = await db
      .collection("research_files")
      .find({ carId: carId })
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
    await db.collection("research_files").deleteMany({ carId: carId });

    return NextResponse.json({ message: "All files deleted successfully" });
  } catch (error) {
    console.error("Error deleting all files:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete all files",
      },
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
