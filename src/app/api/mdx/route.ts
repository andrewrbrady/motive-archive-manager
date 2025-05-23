import { NextRequest, NextResponse } from "next/server";
import { dbConnect, connectToDatabase } from "@/lib/mongodb";
import { uploadMDXFile, getMDXFile } from "@/lib/s3";
import { MDXFile } from "@/models/MDXFile";
import { WithId, Document, ObjectId } from "mongodb";

interface MDXDocument {
  _id: ObjectId;
  filename: string;
  s3Key: string;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/mdx - Get all MDX files
export async function GET() {
  try {
    // [REMOVED] // [REMOVED] console.log("MDX API - Connecting to MongoDB...");
    const { db } = await connectToDatabase();
    // [REMOVED] // [REMOVED] console.log("MDX API - MongoDB connected, fetching files...");

    // Get files directly from MongoDB collection
    const files = await db
      .collection<MDXDocument>("mdx_files")
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();

    console.log(`MDX API - Found ${files.length} files in MongoDB:`, {
      files: files.map((f) => ({
        _id: f._id.toString(),
        filename: f.filename,
        s3Key: f.s3Key,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });

    // Get content for each file from S3
    // [REMOVED] // [REMOVED] console.log("MDX API - Fetching content from S3...");
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        try {
          console.log(
            `MDX API - Fetching content for file: ${file.filename} (S3 Key: ${file.s3Key})`
          );
          const content = await getMDXFile(file.s3Key);
          console.log(
            `MDX API - Successfully fetched content for: ${file.filename}`
          );
          return {
            _id: file._id.toString(), // Convert ObjectId to string
            filename: file.filename,
            content,
            s3Key: file.s3Key,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          };
        } catch (error) {
          console.error(
            `MDX API - Error fetching content for file ${file.filename}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
          return {
            _id: file._id.toString(), // Convert ObjectId to string
            filename: file.filename,
            content: "",
            s3Key: file.s3Key,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            error:
              error instanceof Error
                ? error.message
                : "Failed to fetch content",
          };
        }
      })
    );

    console.log("MDX API - Successfully processed all files:", {
      count: filesWithContent.length,
      files: filesWithContent.map((f) => ({
        _id: f._id,
        filename: f.filename,
        hasContent: !!f.content,
        hasError: !!f.error,
      })),
    });

    return NextResponse.json({ files: filesWithContent });
  } catch (error: any) {
    console.error("MDX API - Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch MDX files" },
      { status: 500 }
    );
  }
}

// POST /api/mdx - Create a new MDX file
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { filename, content } = await request.json();

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // Check if file with same name already exists
    const existingFile = await MDXFile.findOne({ filename });
    if (existingFile) {
      return NextResponse.json(
        { error: "File with this name already exists" },
        { status: 400 }
      );
    }

    // Upload to S3 first
    const s3Key = await uploadMDXFile(filename, content);

    // Create MongoDB record with filename and s3Key
    const mdxFile = await MDXFile.create({
      filename,
      s3Key,
    });

    // Return the file with content
    return NextResponse.json({
      file: {
        ...mdxFile.toObject(),
        content,
      },
    });
  } catch (error: any) {
    console.error("Error creating MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create MDX file" },
      { status: 500 }
    );
  }
}

// PUT /api/mdx - Update an existing MDX file
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const { id, content } = await request.json();

    const existingFile = await MDXFile.findById(id);
    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Upload updated content to S3
    const s3Key = await uploadMDXFile(existingFile.filename, content);

    // Update MongoDB record with new s3Key
    existingFile.s3Key = s3Key;
    await existingFile.save();

    // Return the file with content
    return NextResponse.json({
      file: {
        ...existingFile.toObject(),
        content,
      },
    });
  } catch (error: any) {
    console.error("Error updating MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update MDX file" },
      { status: 500 }
    );
  }
}

// DELETE /api/mdx - Delete an MDX file
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Find and delete the file from MongoDB
    const mdxFile = await MDXFile.findByIdAndDelete(id);

    if (!mdxFile) {
      return NextResponse.json(
        { error: "MDX file not found" },
        { status: 404 }
      );
    }

    // Note: We're not deleting from S3 to keep history
    // If you want to delete from S3, you would call a deleteMDXFile function here

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete MDX file" },
      { status: 500 }
    );
  }
}
