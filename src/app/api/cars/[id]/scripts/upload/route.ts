import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { uploadFile } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload file to S3 with script_files type
    const s3Result = await uploadFile(file, params.id, "script_files");

    // Save file metadata to MongoDB
    const db = await getDatabase();
    const result = await db.collection("script_files").insertOne({
      carId: new ObjectId(params.id),
      filename: s3Result.filename,
      s3Key: s3Result.key,
      contentType: s3Result.contentType,
      size: s3Result.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      _id: result.insertedId.toString(),
      filename: s3Result.filename,
      contentType: s3Result.contentType,
      size: s3Result.size,
      url: s3Result.url,
    });
  } catch (error) {
    console.error("Error uploading script file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
