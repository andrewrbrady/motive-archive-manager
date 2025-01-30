import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { ResearchFile } from "@/models/ResearchFile";
import {
  uploadResearchFile,
  deleteResearchFile,
  generatePresignedDownloadUrl,
  deleteFile,
} from "@/lib/s3";
import clientPromise from "@/lib/mongodb";
import { connectToDatabase } from "@/lib/mongodb";

export const maxDuration = 60;
export const runtime = "nodejs";

interface RouteContext {
  params: {
    id: string;
  };
}

// GET research files for a car
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log("Research Files API - Request Details:", {
      url: request.url,
      method: request.method,
      carId: params.id,
      headers: Object.fromEntries(request.headers.entries()),
    });

    console.log("Research Files API - Environment:", {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
    });

    const { db } = await connectToDatabase();
    console.log("Research Files API - MongoDB Connected");

    const files = await db
      .collection("research_files")
      .find({ carId: params.id })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("Research Files API - MongoDB Query Results:", {
      filesFound: files.length,
      carId: params.id,
      fileIds: files.map((f) => f._id.toString()),
    });

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const url = await generatePresignedDownloadUrl(file.s3Key);
          console.log("Research Files API - Generated URL for file:", {
            fileId: file._id.toString(),
            s3Key: file.s3Key,
            urlGenerated: !!url,
          });
          return {
            ...file,
            _id: file._id.toString(),
            url,
          };
        } catch (error) {
          console.error("Research Files API - Error generating URL:", {
            fileId: file._id.toString(),
            s3Key: file.s3Key,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          throw error;
        }
      })
    );

    console.log("Research Files API - Response prepared:", {
      totalFiles: filesWithUrls.length,
      hasUrls: filesWithUrls.every((f) => !!f.url),
    });

    return NextResponse.json(filesWithUrls);
  } catch (error) {
    console.error("Research Files API - Error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch research files" },
      { status: 500 }
    );
  }
}

// POST new research file
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload file to S3
    const uploadResult = await uploadResearchFile(file, params.id);

    // Create research file document
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "motive_archive");
    const collection = db.collection("research_files");

    const researchFile = {
      carId: new ObjectId(params.id),
      filename: uploadResult.filename,
      s3Key: uploadResult.key,
      contentType: uploadResult.contentType,
      size: uploadResult.size,
      description: description || "",
      tags: tags ? JSON.parse(tags) : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(researchFile);

    return NextResponse.json({
      ...researchFile,
      _id: result.insertedId,
      url: uploadResult.url,
    });
  } catch (error) {
    console.error("Error uploading research file:", error);
    return NextResponse.json(
      { error: "Failed to upload research file" },
      { status: 500 }
    );
  }
}

// DELETE research file
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from S3
    await deleteFile(file.s3Key);

    // Delete from MongoDB
    await db
      .collection("research_files")
      .deleteOne({ _id: new ObjectId(fileId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting research file:", error);
    return NextResponse.json(
      { error: "Failed to delete research file" },
      { status: 500 }
    );
  }
}
