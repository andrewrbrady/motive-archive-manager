import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getDocumentationFileUrl } from "@/lib/s3";
import { Car } from "@/models/Car";
import { Documentation } from "@/models/Documentation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/documentation

    const db = await getDatabase();
    const documentationFiles = await db
      .collection("documentation_files")
      .find({ carId: new ObjectId(id) })
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
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch documentation files",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
