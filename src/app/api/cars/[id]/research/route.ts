import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { ResearchFile } from "@/models/ResearchFile";
import {
  uploadResearchFile,
  deleteResearchFile,
  generatePresignedDownloadUrl,
  deleteFile,
} from "@/lib/s3";
import clientPromise from "@/lib/mongodb";
import { getDatabase } from "@/lib/mongodb";

export const maxDuration = 60;
export const runtime = "nodejs";

interface RouteContext {
  params: {
    id: string;
  };
}

interface Car {
  _id: ObjectId;
  researchFiles: ObjectId[];
}

// GET research files for a car
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const db = await getDatabase();

    // Get all research files for this car, handling both string and ObjectId carIds
    const files = await db
      .collection("research_files")
      .find({
        $or: [
          { carId: new ObjectId(carId) },
          { carId: carId },
          { "metadata.carId": new ObjectId(carId) },
          { "metadata.carId": carId },
        ],
      })
      .toArray();

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error fetching research files:", error);
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
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const carId = params.id;
    const { content, filename } = await request.json();

    if (!content || !filename) {
      return NextResponse.json(
        { error: "Content and filename are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Create research file document
    const result = await db.collection("research_files").insertOne({
      carId,
      content,
      filename,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update car document with proper typing
    const updateFilter: UpdateFilter<Car> = {
      $push: { researchFiles: result.insertedId },
    };

    await db
      .collection<Car>("cars")
      .updateOne({ _id: new ObjectId(carId) }, updateFilter);

    return NextResponse.json({
      success: true,
      fileId: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating research file:", error);
    return NextResponse.json(
      { error: "Failed to create research file" },
      { status: 500 }
    );
  }
}

// DELETE research file
export async function DELETE(
  request: NextRequest,
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

    const db = await getDatabase();
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId) });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete from S3
    await deleteFile(file.s3Key);

    // Delete the file document
    await db
      .collection("research_files")
      .deleteOne({ _id: new ObjectId(fileId) });

    // Update car document to remove the file reference
    const updateFilter: UpdateFilter<Car> = {
      $pull: { researchFiles: new ObjectId(fileId) },
    };

    await db
      .collection<Car>("cars")
      .updateOne({ _id: new ObjectId(params.id) }, updateFilter);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting research file:", error);
    return NextResponse.json(
      { error: "Failed to delete research file" },
      { status: 500 }
    );
  }
}
