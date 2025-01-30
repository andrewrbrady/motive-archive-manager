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
    const carId = params.id;
    console.log("Research Files API - Request Details:", {
      url: request.url,
      method: request.method,
      carId,
      headers: Object.fromEntries(request.headers.entries()),
    });

    console.log("Research Files API - Environment:", {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI:
        process.env.MONGODB_URI?.split("@")[1]?.split("/")[0] ||
        "URI not found", // Only log the host part for security
    });

    const { db } = await connectToDatabase();
    console.log("Research Files API - MongoDB Connected");

    // List all collections to verify we're in the right database
    const collections = await db.listCollections().toArray();
    console.log("Research Files API - Database Info:", {
      databaseName: db.databaseName,
      collections: collections.map((c) => c.name),
      researchFilesExists: collections.some((c) => c.name === "research_files"),
    });

    // Check a document directly without any query to verify connection
    const sampleDoc = await db.collection("research_files").findOne({});
    console.log("Research Files API - Sample Document:", {
      exists: !!sampleDoc,
      structure: sampleDoc
        ? {
            _id: sampleDoc._id.toString(),
            carId:
              sampleDoc.carId instanceof ObjectId
                ? sampleDoc.carId.toString()
                : typeof sampleDoc.carId === "string"
                ? sampleDoc.carId
                : "unknown type",
            fields: Object.keys(sampleDoc || {}),
            collectionName: "research_files",
          }
        : null,
    });

    // Query using string ID
    const files = await db
      .collection("research_files")
      .find({ carId: carId })
      .toArray();

    console.log("Research Files API - Query Results:", {
      filesFound: files.length,
      carId,
      query: { carId },
      fileIds: files.map((f) => f._id),
    });

    // Process files and generate URLs
    const signedUrls = files.length > 0 ? await generateSignedUrls(files) : [];

    const response = {
      totalFiles: files.length,
      hasUrls: signedUrls.length > 0,
      files: signedUrls || [], // Ensure we always return an array
    };

    console.log("Research Files API - Response prepared:", {
      totalFiles: files.length,
      hasUrls: signedUrls.length > 0,
      filesArrayLength: signedUrls?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("Research Files API - Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch research files" },
      { status: 500 }
    );
  }
}

async function generateSignedUrls(files: any[]) {
  return Promise.all(
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
