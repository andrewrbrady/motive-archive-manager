import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { MDXFile } from "@/models/MDXFile";

// Delete an MDX file by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

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
