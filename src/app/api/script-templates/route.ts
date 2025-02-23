import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface ScriptRow {
  id: string;
  time: string;
  video: string;
  audio: string;
  gfx: string;
}

export type Platform =
  | "instagram_reels"
  | "youtube_shorts"
  | "youtube"
  | "stream_otv";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  platforms: Platform[];
  aspectRatio: AspectRatio;
  rows: ScriptRow[];
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  try {
    const db = await getDatabase();
    const templates = await db.collection("script_templates").find().toArray();

    // Convert _id to id for frontend compatibility
    const formattedTemplates = templates.map((template) => ({
      ...template,
      id: template._id.toString(),
      _id: undefined,
    }));

    return NextResponse.json(formattedTemplates);
  } catch (error) {
    console.error("Error fetching script templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch script templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDatabase();

    const template = {
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection("script_templates").insertOne(template);
    const createdTemplate = await db
      .collection("script_templates")
      .findOne({ _id: result.insertedId });

    if (!createdTemplate) {
      return NextResponse.json(
        { error: "Failed to create script template" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...createdTemplate,
      id: createdTemplate._id.toString(),
      _id: undefined,
    });
  } catch (error) {
    console.error("Error creating script template:", error);
    return NextResponse.json(
      { error: "Failed to create script template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    const db = await getDatabase();

    const result = await db.collection("script_templates").findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...result,
      id: result._id.toString(),
      _id: undefined,
    });
  } catch (error) {
    console.error("Error updating script template:", error);
    return NextResponse.json(
      { error: "Failed to update script template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db
      .collection("script_templates")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting script template:", error);
    return NextResponse.json(
      { error: "Failed to delete script template" },
      { status: 500 }
    );
  }
}
