import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { ResearchFile } from "@/models/ResearchFile";
import {
  uploadResearchFile,
  deleteFile,
  generatePresignedDownloadUrl,
} from "@/lib/s3";
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
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const shouldGenerateUrls = url.searchParams.get("includeUrls") === "true";
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();

    // Use projection to only get necessary fields
    const query = { carId };
    const projection = {
      s3Key: 1,
      filename: 1,
      description: 1,
      tags: 1,
      createdAt: 1,
      size: 1,
    };

    // Execute queries in parallel
    const [files, total] = await Promise.all([
      db
        .collection("research_files")
        .find(query, { projection })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("research_files").countDocuments(query),
    ]);

    // Process files based on whether URLs are needed
    const processedFiles = shouldGenerateUrls
      ? await Promise.all(
          files.map(async (file) => ({
            ...file,
            _id: file._id.toString(),
            url: await generatePresignedDownloadUrl(file.s3Key),
          }))
        )
      : files.map((file) => ({
          ...file,
          _id: file._id.toString(),
        }));

    return NextResponse.json({
      files: processedFiles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: total > skip + files.length,
      },
    });
  } catch (error) {
    console.error("Error fetching research files:", error);
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

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".md")) {
      return NextResponse.json(
        { error: "Only markdown (.md) files are supported" },
        { status: 400 }
      );
    }

    // Upload file to S3
    const uploadResult = await uploadResearchFile(file, params.id);

    // Create research file document using connection pool
    const { db } = await connectToDatabase();
    const collection = db.collection("research_files");

    const researchFile = {
      carId: params.id, // Store as string for consistent querying
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

    // Use projection to only get the s3Key
    const file = await db
      .collection("research_files")
      .findOne({ _id: new ObjectId(fileId) }, { projection: { s3Key: 1 } });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Execute delete operations in parallel
    await Promise.all([
      deleteFile(file.s3Key),
      db.collection("research_files").deleteOne({ _id: new ObjectId(fileId) }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting research file:", error);
    return NextResponse.json(
      { error: "Failed to delete research file" },
      { status: 500 }
    );
  }
}
