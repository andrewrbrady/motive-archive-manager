import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedDownloadUrl } from "@/lib/s3";
import { z } from "zod";

export type Platform =
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "stream_otv";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

const scriptSchema = z.object({
  name: z.string(),
  description: z.string(),
  platforms: z.array(
    z.enum(["instagram_reels", "youtube_shorts", "youtube", "stream_otv"])
  ),
  aspectRatio: z.enum(["9:16", "16:9", "1:1", "4:5"]),
  content: z.string(),
  brief: z.string(),
  duration: z.string(),
  rows: z
    .array(
      z.object({
        id: z.string(),
        time: z.string(),
        video: z.string(),
        audio: z.string(),
        gfx: z.string(),
      })
    )
    .optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const scripts = await db
      .collection("scripts")
      .find({ carId: new ObjectId(params.id) })
      .toArray();

    return NextResponse.json(scripts);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    // Delete the file from MongoDB
    const result = await db
      .collection("script_files")
      .deleteOne({ _id: new ObjectId(fileId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting script file:", error);
    return NextResponse.json(
      { error: "Failed to delete script file" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const body = await request.json();

    const validatedData = scriptSchema.parse({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await db.collection("scripts").insertOne({
      ...validatedData,
      carId: new ObjectId(params.id),
    });

    return NextResponse.json(
      { _id: result.insertedId, ...validatedData },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await getDatabase();
    const body = await request.json();

    const validatedData = scriptSchema.parse({
      ...body,
      updatedAt: new Date(),
    });

    const result = await db
      .collection("scripts")
      .updateOne(
        { _id: new ObjectId(body._id), carId: new ObjectId(params.id) },
        { $set: validatedData }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Script not found" }, { status: 404 });
    }

    return NextResponse.json(
      { _id: body._id, ...validatedData },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
