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

export interface ScriptTemplate {
  _id?: string;
  name: string;
  description: string;
  rows: ScriptRow[];
  createdAt: Date;
  updatedAt: Date;
}

export async function GET() {
  try {
    const db = await getDatabase();
    const templates = await db.collection("script_templates").find().toArray();

    return NextResponse.json(templates);
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
    const { name, description, rows } = body;

    if (!name || !description || !rows) {
      return NextResponse.json(
        { error: "Name, description, and rows are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection("script_templates").insertOne({
      name,
      description,
      rows,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      _id: result.insertedId.toString(),
      name,
      description,
      rows,
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
    const { _id, name, description, rows } = body;

    if (!_id || !name || !description || !rows) {
      return NextResponse.json(
        { error: "ID, name, description, and rows are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db.collection("script_templates").updateOne(
      { _id: new ObjectId(_id) },
      {
        $set: {
          name,
          description,
          rows,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
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
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const result = await db
      .collection("script_templates")
      .deleteOne({ _id: new ObjectId(templateId) });

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
