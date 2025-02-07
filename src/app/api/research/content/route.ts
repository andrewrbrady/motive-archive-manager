import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB and get file metadata
    const { db } = await connectToDatabase();
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      console.error(`File not found in MongoDB: ${fileId}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.log("Found file in MongoDB:", {
      id: file._id.toString(),
      filename: file.filename,
      hasContent: !!file.content,
      hasS3Key: !!file.s3Key,
      fields: Object.keys(file),
      s3Key: file.s3Key,
      contentLength: file.content?.length,
    });

    // First try to get content from MongoDB if it exists
    if (file.content) {
      return new NextResponse(file.content, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    // If not in MongoDB, fetch from S3
    if (!file.s3Key) {
      console.error(`File ${fileId} has no content and no S3 key`);
      return NextResponse.json(
        { error: "File content not found" },
        { status: 404 }
      );
    }

    try {
      // Get file from S3
      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: file.s3Key,
        })
      );

      if (!s3Response.Body) {
        console.error(`S3 response has no body for key ${file.s3Key}`);
        return NextResponse.json(
          { error: "File content not found in S3" },
          { status: 404 }
        );
      }

      // Convert stream to text
      const content = await s3Response.Body.transformToString();

      // Store content in MongoDB for future use
      await db
        .collection("research_files")
        .updateOne({ _id: new ObjectId(fileId) }, { $set: { content } });

      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain",
        },
      });
    } catch (error) {
      console.error(`S3 error for key ${file.s3Key}:`, error);
      return NextResponse.json(
        { error: "Failed to fetch content from S3" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching research content:", error);
    return NextResponse.json(
      { error: "Failed to fetch research content" },
      { status: 500 }
    );
  }
}
