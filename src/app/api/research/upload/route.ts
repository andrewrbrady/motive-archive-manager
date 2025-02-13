import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { connectToDatabase } from "@/lib/mongodb";
import { prepareResearchContent } from "@/lib/hybridSearch";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const carId = formData.get("carId") as string;

    if (!file || !carId) {
      return NextResponse.json(
        { error: "File and carId are required" },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const s3Key = `cars/${carId}/${filename}`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: s3Key,
        Body: content,
        ContentType: file.type,
      })
    );

    // Save file metadata to MongoDB
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

    console.log("Saved file metadata to MongoDB:", {
      id: fileDoc.insertedId.toString(),
      filename: file.name,
      s3Key,
      size: file.size,
    });

    // Prepare content for searching
    await prepareResearchContent(
      content,
      carId,
      fileDoc.insertedId.toString(),
      file.name
    );

    return NextResponse.json({
      _id: fileDoc.insertedId,
      filename: file.name,
      contentType: file.type,
      size: file.size,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
