import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Get all research files for this car
    const files = await db
      .collection("research_files")
      .find({ carId })
      .toArray();

    // Extract and combine content from all files
    const content = files
      .map((file) => file.content)
      .filter(Boolean)
      .join("\n\n");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error fetching research content:", error);
    return NextResponse.json(
      { error: "Failed to fetch research content" },
      { status: 500 }
    );
  }
}
