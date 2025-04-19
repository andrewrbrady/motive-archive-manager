import { NextRequest, NextResponse } from "next/server";
import { dbConnect, connectToDatabase } from "@/lib/mongodb";
import { uploadMDXFile, getMDXFile } from "@/lib/s3";
import { AdvancedMDXFile, IAdvancedMDXFile } from "@/models/AdvancedMDXFile";
import { WithId, Document, ObjectId } from "mongodb";
import matter from "gray-matter";

interface AdvancedMDXDocument extends WithId<Document> {
  _id: ObjectId;
  filename: string;
  s3Key: string;
  frontmatter?: {
    title?: string;
    subtitle?: string;
    type?: string;
    slug?: string;
    author?: string;
    tags?: string[];
    cover?: string;
    specs?: {
      [key: string]: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/advanced-mdx - Get all advanced MDX files
export async function GET() {
  try {
    console.log("Advanced MDX API - Connecting to MongoDB...");
    const { db } = await connectToDatabase();
    console.log("Advanced MDX API - MongoDB connected, fetching files...");

    // Get files directly from MongoDB collection
    const files = await db
      .collection<AdvancedMDXDocument>("advanced_mdx_files")
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();

    console.log(`Advanced MDX API - Found ${files.length} files in MongoDB`);

    // Get content for each file from S3
    console.log("Advanced MDX API - Fetching content from S3...");
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        try {
          console.log(
            `Advanced MDX API - Fetching content for file: ${file.filename}`
          );
          const content = await getMDXFile(file.s3Key);

          // Parse frontmatter
          const { data: frontmatter } = matter(content);

          console.log(
            `Advanced MDX API - Successfully fetched content for: ${file.filename}`
          );
          return {
            _id: file._id.toString(),
            filename: file.filename,
            content,
            frontmatter,
            s3Key: file.s3Key,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          };
        } catch (error) {
          console.error(
            `Advanced MDX API - Error fetching content for file ${file.filename}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
          return {
            _id: file._id.toString(),
            filename: file.filename,
            content: "",
            frontmatter: file.frontmatter || {},
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

    return NextResponse.json({ files: filesWithContent });
  } catch (error: any) {
    console.error("Advanced MDX API - Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch advanced MDX files" },
      { status: 500 }
    );
  }
}

// POST /api/advanced-mdx - Create a new advanced MDX file
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

    // Parse frontmatter from content
    const { data: frontmatter } = matter(content);

    // Immediately upload to S3
    const s3Key = await uploadMDXFile(filename, content);

    // Immediately create MongoDB record
    const mdxFile = await AdvancedMDXFile.create({
      filename,
      s3Key,
      frontmatter,
    });

    // Return the file with content
    return NextResponse.json({
      file: {
        ...mdxFile.toObject(),
        content,
        frontmatter,
      },
    });
  } catch (error: any) {
    console.error("Error creating advanced MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create advanced MDX file" },
      { status: 500 }
    );
  }
}

// PUT /api/advanced-mdx - Update an existing advanced MDX file
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const { id, content } = await request.json();

    const existingFile = await AdvancedMDXFile.findById(id);
    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Parse frontmatter from content
    const { data: frontmatter } = matter(content);

    // Upload updated content to S3
    const s3Key = await uploadMDXFile(existingFile.filename, content);

    // Update MongoDB record with new s3Key and frontmatter
    existingFile.s3Key = s3Key;
    existingFile.frontmatter = frontmatter;
    await existingFile.save();

    // Return the file with content
    return NextResponse.json({
      file: {
        ...existingFile.toObject(),
        content,
        frontmatter,
      },
    });
  } catch (error: any) {
    console.error("Error updating advanced MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update advanced MDX file" },
      { status: 500 }
    );
  }
}

// DELETE /api/advanced-mdx - Delete an advanced MDX file
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
    const mdxFile = await AdvancedMDXFile.findByIdAndDelete(id);

    if (!mdxFile) {
      return NextResponse.json(
        { error: "Advanced MDX file not found" },
        { status: 404 }
      );
    }

    // Note: We're not deleting from S3 to keep history
    // If you want to delete from S3, you would call a deleteMDXFile function here

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting advanced MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete advanced MDX file" },
      { status: 500 }
    );
  }
}
