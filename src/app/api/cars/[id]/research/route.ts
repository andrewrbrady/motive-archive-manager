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
        "URI not found",
      MONGODB_DB: process.env.MONGODB_DB || "motive_archive",
    });

    const { db } = await connectToDatabase();
    console.log("Research Files API - MongoDB Connected");

    // Convert carId to ObjectId
    const carObjectId = new ObjectId(carId);
    console.log("Research Files API - Car ObjectId:", carObjectId.toString());

    // List all collections to verify research_files exists
    const collections = await db.listCollections().toArray();
    console.log(
      "Research Files API - Available Collections:",
      collections.map((c) => c.name)
    );

    // Try both research_files and research collections
    let files = [];

    // First try research_files collection with both string and ObjectId formats
    const researchFilesQuery = {
      $or: [
        { carId: carObjectId },
        { carId: carId },
        { "metadata.carId": carObjectId },
        { "metadata.carId": carId },
      ],
    };
    console.log(
      "Research Files API - Query research_files:",
      JSON.stringify(researchFilesQuery)
    );

    files = await db
      .collection("research_files")
      .find(researchFilesQuery)
      .toArray();

    // If no files found, try the research collection with the same query
    if (files.length === 0) {
      console.log(
        "Research Files API - No files found in research_files, trying research collection"
      );
      files = await db
        .collection("research")
        .find(researchFilesQuery)
        .toArray();

      // Log sample from research collection if found
      if (files.length > 0) {
        console.log(
          "Research Files API - Sample Document from research collection:",
          JSON.stringify(files[0], null, 2)
        );
      }
    }

    console.log("Research Files API - Query Results:", {
      filesFound: files.length,
      carId: carObjectId.toString(),
      fileIds: files.map((f) => f._id.toString()),
      sampleFile:
        files.length > 0
          ? {
              _id: files[0]._id.toString(),
              carId: files[0].carId?.toString(),
              metadata: files[0].metadata,
            }
          : null,
    });

    // Process files and generate URLs
    const processedFiles = files.map((file) => ({
      ...file,
      _id: file._id.toString(),
      carId: file.carId
        ? typeof file.carId === "object"
          ? file.carId.toString()
          : file.carId
        : carId,
      metadata: {
        ...file.metadata,
        carId: file.metadata?.carId
          ? typeof file.metadata.carId === "object"
            ? file.metadata.carId.toString()
            : file.metadata.carId
          : undefined,
      },
    }));

    return NextResponse.json({
      files: processedFiles || [], // Ensure we always return an array
    });
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
        console.log("Research Files API - Generating URL for file:", {
          fileId: file._id.toString(),
          s3Key: file.s3Key,
          hasS3Key: !!file.s3Key,
          awsRegion: process.env.AWS_REGION,
          awsBucketConfigured: !!process.env.AWS_BUCKET_NAME,
        });

        if (!file.s3Key) {
          console.error(
            "Research Files API - Missing S3 key for file:",
            file._id.toString()
          );
          return {
            ...file,
            _id: file._id.toString(),
            url: null,
            error: "Missing S3 key",
          };
        }

        const url = await generatePresignedDownloadUrl(file.s3Key);

        console.log("Research Files API - Generated URL for file:", {
          fileId: file._id.toString(),
          s3Key: file.s3Key,
          urlGenerated: !!url,
          urlLength: url?.length,
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
          stack: error instanceof Error ? error.stack : undefined,
        });

        return {
          ...file,
          _id: file._id.toString(),
          url: null,
          error:
            error instanceof Error ? error.message : "Failed to generate URL",
        };
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

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".md")) {
      return NextResponse.json(
        { error: "Only markdown (.md) files are supported" },
        { status: 400 }
      );
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
