import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface SystemPrompt {
  _id?: string;
  name: string;
  description: string;
  prompt: string;
  type: "car_caption" | "project_caption";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET - Fetch all system prompts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const systemPrompts = await db
      .collection("systemPrompts")
      .find({})
      .sort({ type: 1, name: 1 })
      .toArray();

    return NextResponse.json(systemPrompts);
  } catch (error) {
    console.error("Error fetching system prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch system prompts" },
      { status: 500 }
    );
  }
}

// POST - Create a new system prompt
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, prompt, type, isActive } = body;

    if (!name || !description || !prompt || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["car_caption", "project_caption"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid prompt type" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // If this is being set as active, deactivate other prompts of the same type
    if (isActive) {
      await db
        .collection("systemPrompts")
        .updateMany({ type }, { $set: { isActive: false } });
    }

    const newSystemPrompt: Omit<SystemPrompt, "_id"> = {
      name,
      description,
      prompt,
      type,
      isActive: isActive || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("systemPrompts")
      .insertOne(newSystemPrompt);

    return NextResponse.json({
      _id: result.insertedId,
      ...newSystemPrompt,
    });
  } catch (error) {
    console.error("Error creating system prompt:", error);
    return NextResponse.json(
      { error: "Failed to create system prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update a system prompt
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, prompt, type, isActive } = body;

    if (!id || !name || !description || !prompt || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // If this is being set as active, deactivate other prompts of the same type
    if (isActive) {
      await db
        .collection("systemPrompts")
        .updateMany(
          { type, _id: { $ne: new ObjectId(id) } },
          { $set: { isActive: false } }
        );
    }

    const updateData = {
      name,
      description,
      prompt,
      type,
      isActive: isActive || false,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("systemPrompts")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "System prompt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating system prompt:", error);
    return NextResponse.json(
      { error: "Failed to update system prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a system prompt
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const result = await db
      .collection("systemPrompts")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "System prompt not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting system prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete system prompt" },
      { status: 500 }
    );
  }
}
