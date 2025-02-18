import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    console.log("Research Content API - MongoDB Connected");

    const fileId = searchParams.get("fileId");

    console.log("Research Content API - Request Details:", {
      fileId,
      carId,
      url: request.url,
    });

    if (!fileId || !carId) {
      return NextResponse.json(
        { error: "File ID and Car ID are required" },
        { status: 400 }
      );
    }

    // First try to find the file in research_files collection
    const query = {
      _id: new ObjectId(fileId),
      $or: [
        { carId: new ObjectId(carId) },
        { carId: carId },
        { "metadata.carId": new ObjectId(carId) },
        { "metadata.carId": carId },
      ],
    };

    console.log("Research Content API - Query:", JSON.stringify(query));

    const file = await db.collection("research_files").findOne(query);

    if (!file) {
      console.log(
        "Research Content API - File not found in research_files, trying research collection"
      );
      // Try research collection if not found
      const file = await db.collection("research").findOne(query);
      if (!file) {
        console.error(
          "Research Content API - File not found in either collection"
        );
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    console.log("Research Content API - File found:", {
      id: file._id.toString(),
      filename: file.filename,
      hasContent: !!file.content,
      hasS3Key: !!file.s3Key,
      s3Key: file.s3Key,
    });

    // First check if content is stored in MongoDB
    if (file.content) {
      console.log("Research Content API - Returning content from MongoDB");
      return new NextResponse(file.content, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // If no content in MongoDB, get from S3
    if (!file.s3Key) {
      console.error("Research Content API - File has no content and no S3 key");
      return NextResponse.json(
        { error: "File content not found" },
        { status: 404 }
      );
    }

    try {
      console.log("Research Content API - Fetching from S3:", {
        bucket: process.env.AWS_BUCKET_NAME,
        key: file.s3Key,
      });

      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: file.s3Key,
        })
      );

      if (!s3Response.Body) {
        console.error("Research Content API - S3 response has no body");
        throw new Error("Failed to get file content from S3");
      }

      // Convert stream to text
      const content = await s3Response.Body.transformToString();
      console.log(
        "Research Content API - Successfully retrieved content from S3"
      );

      // Store content in MongoDB for future use
      await db
        .collection("research_files")
        .updateOne(
          { _id: file._id },
          { $set: { content, updatedAt: new Date() } }
        );

      return new NextResponse(content, {
        headers: { "Content-Type": "text/plain" },
      });
    } catch (error) {
      console.error("Research Content API - S3 Error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Failed to fetch content from S3" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Research Content API - Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const { fileId, content } = await request.json();

    if (!fileId || !carId || content === undefined) {
      return NextResponse.json(
        { error: "File ID, Car ID, and content are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Update the file content
    const result = await db.collection("research_files").updateOne(
      { _id: new ObjectId(fileId), carId },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating file content:", error);
    return NextResponse.json(
      { error: "Failed to update file content" },
      { status: 500 }
    );
  }
}
