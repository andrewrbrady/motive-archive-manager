import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getDocumentationFileUrl } from "@/lib/s3";
import { Car } from "@/models/Car";
import { Documentation } from "@/models/Documentation";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const documentationFiles = await db
      .collection("documentation_files")
      .find({ carId: new ObjectId(params.id) })
      .sort({ createdAt: -1 })
      .toArray();

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      documentationFiles.map(async (file) => {
        try {
          const url = await getDocumentationFileUrl(file.s3Key);
          return {
            ...file,
            _id: file._id.toString(),
            url,
          };
        } catch (error) {
          console.error(`Error getting URL for file ${file._id}:`, error);
          return {
            ...file,
            _id: file._id.toString(),
            url: null,
            error: "Failed to generate URL",
          };
        }
      })
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (error) {
    console.error("Error fetching documentation files:", error);
    return NextResponse.json(
      { error: "Failed to fetch documentation files" },
      { status: 500 }
    );
  }
}
