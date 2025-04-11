import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/scripts/content

    const { searchParams } = url;
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get the script file from MongoDB
    const scriptFile = await db.collection("script_files").findOne({
      _id: new ObjectId(fileId),
    });

    if (!scriptFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // If content is already in MongoDB, return it along with rows
    if (scriptFile.content) {
      return new NextResponse(scriptFile.content, {
        headers: {
          "Content-Type": "text/plain",
          "X-Script-Rows": scriptFile.rows
            ? JSON.stringify(scriptFile.rows)
            : "[]",
        },
      });
    }

    // If no content in MongoDB, get from S3
    if (!scriptFile.s3Key) {
      return NextResponse.json(
        { error: "File content not found" },
        { status: 404 }
      );
    }

    try {
      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: scriptFile.s3Key,
        })
      );

      if (!s3Response.Body) {
        throw new Error("Failed to get file content from S3");
      }

      // Convert stream to text
      const content = await s3Response.Body.transformToString();

      // Store content in MongoDB for future use
      await db
        .collection("script_files")
        .updateOne(
          { _id: scriptFile._id },
          { $set: { content, updatedAt: new Date() } }
        );

      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/plain",
          "X-Script-Rows": "[]",
        },
      });
    } catch (error) {
      console.error("Error fetching content from S3:", error);
      return NextResponse.json(
        { error: "Failed to fetch content from S3" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching file content:", error);
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 3]; // -3 because URL is /cars/[id]/scripts/content

    const body = await request.json();
    const {
      fileId,
      content,
      rows,
      brief,
      duration,
      name,
      description,
      platforms,
      aspectRatio,
    } = body;

    if (!fileId || content === undefined) {
      return NextResponse.json(
        { error: "File ID and content are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Update the script in MongoDB
    const result = await db.collection("scripts").findOneAndUpdate(
      { _id: new ObjectId(fileId), carId: new ObjectId(id) },
      {
        $set: {
          content,
          rows,
          brief,
          duration,
          name,
          description,
          platforms,
          aspectRatio,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating script content:", error);
    return NextResponse.json(
      { error: "Failed to update script content" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
