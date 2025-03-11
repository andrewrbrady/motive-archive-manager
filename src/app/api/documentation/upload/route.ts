import { NextRequest, NextResponse } from "next/server";
import { uploadDocumentationFile } from "@/lib/s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Car } from "@/models/Car";
import { Documentation } from "@/models/Documentation";

// Use the new route segment config export
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const carId = formData.get("carId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!carId) {
      return NextResponse.json(
        { error: "No car ID provided" },
        { status: 400 }
      );
    }

    // Upload file to S3
    const s3Result = await uploadDocumentationFile(file, carId);

    // Save file metadata to MongoDB
    const db = await getDatabase();
    const result = await db.collection("documentation_files").insertOne({
      carId: new ObjectId(carId),
      filename: s3Result.filename,
      s3Key: s3Result.key,
      contentType: s3Result.contentType,
      size: s3Result.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add documentationId to the car
    await db.collection("cars").updateOne(
      { _id: new ObjectId(carId) },
      {
        $addToSet: { documentationIds: result.insertedId },
      }
    );

    return NextResponse.json({
      _id: result.insertedId.toString(),
      filename: s3Result.filename,
      contentType: s3Result.contentType,
      size: s3Result.size,
      url: s3Result.url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error uploading documentation file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
