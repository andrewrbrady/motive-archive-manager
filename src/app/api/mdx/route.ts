import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { uploadMDXFile, getMDXFile } from "@/lib/s3";
import { MDXFile } from "@/models/MDXFile";

// GET /api/mdx - Get all MDX files
export async function GET() {
  try {
    await dbConnect();
    const files = await MDXFile.find().sort({ updatedAt: -1 });

    // Get content for each file from S3
    const filesWithContent = await Promise.all(
      files.map(async (file) => {
        const content = await getMDXFile(file.s3Key);
        return {
          ...file.toObject(),
          content,
        };
      })
    );

    return NextResponse.json({ files: filesWithContent });
  } catch (error: any) {
    console.error("Error fetching MDX files:", error);
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

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    const mdxFile = await MDXFile.findOneAndDelete({ filename });

    if (!mdxFile) {
      return NextResponse.json(
        { error: "MDX file not found" },
        { status: 404 }
      );
    }

    // Note: We're not deleting from S3 to keep history
    // If you want to delete from S3, you would call a deleteMDXFile function here

    return NextResponse.json({ message: "MDX file deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting MDX file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete MDX file" },
      { status: 500 }
    );
  }
}
