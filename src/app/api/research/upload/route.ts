import { NextResponse } from "next/server";
import { generatePresignedUploadUrl, generateS3Key } from "@/lib/s3";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file") as File;
    const carId = data.get("carId") as string;

    if (!file || !carId) {
      return NextResponse.json(
        { error: "File and carId are required" },
        { status: 400 }
      );
    }

    // Generate a unique S3 key for the file
    const s3Key = generateS3Key(carId, file.name);

    // Generate a presigned URL for uploading
    const uploadUrl = await generatePresignedUploadUrl(s3Key, file.type);

    // Upload the file using the presigned URL
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!upload.ok) {
      throw new Error("Failed to upload file to S3");
    }

    // Store the file reference in MongoDB
    const { db } = await connectToDatabase();
    const fileDoc = await db.collection("research_files").insertOne({
      carId,
      filename: file.name,
      s3Key,
      contentType: file.type,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      _id: fileDoc.insertedId,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      s3Key,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Failed to process file upload" },
      { status: 500 }
    );
  }
}
