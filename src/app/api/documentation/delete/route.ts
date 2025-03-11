import { NextRequest, NextResponse } from "next/server";
import { deleteDocumentationFile } from "@/lib/s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(request: NextRequest) {
  try {
    const { fileId, carId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "No file ID provided" },
        { status: 400 }
      );
    }

    if (!carId) {
      return NextResponse.json(
        { error: "No car ID provided" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find the file to get the S3 key
    const file = await db.collection("documentation_files").findOne({
      _id: new ObjectId(fileId),
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete the file from S3
    await deleteDocumentationFile(file.s3Key);

    // Delete the file metadata from MongoDB
    await db.collection("documentation_files").deleteOne({
      _id: new ObjectId(fileId),
    });

    // Remove documentationId from the car
    await db
      .collection("cars")
      .updateOne({ _id: new ObjectId(carId) }, {
        $pull: { documentationIds: new ObjectId(fileId) },
      } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting documentation file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
