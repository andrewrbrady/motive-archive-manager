import { NextRequest, NextResponse } from "next/server";
import {
  withFirebaseAuth,
  verifyAuthMiddleware,
} from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface SystemPrompt {
  _id?: string;
  name: string;
  description: string;
  prompt: string;
  type?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET - Fetch all system prompts
export async function GET(request: NextRequest) {
  console.log("🔒 GET /api/system-prompts: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ GET /api/system-prompts: Authentication failed");
    return authResult;
  }

  try {
    console.log(
      "🔒 GET /api/system-prompts: Authentication successful, fetching prompts"
    );
    const { db } = await connectToDatabase();
    const systemPrompts = await db
      .collection("systemPrompts")
      .find({})
      .sort({ name: 1 })
      .toArray();

    console.log("✅ GET /api/system-prompts: Successfully fetched prompts", {
      count: systemPrompts.length,
    });
    return NextResponse.json(systemPrompts);
  } catch (error) {
    console.error(
      "💥 GET /api/system-prompts: Error fetching system prompts:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch system prompts" },
      { status: 500 }
    );
  }
}

// POST - Create a new system prompt
export async function POST(request: NextRequest) {
  console.log("🔒 POST /api/system-prompts: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ POST /api/system-prompts: Authentication failed");
    return authResult;
  }

  try {
    const body = await request.json();
    const { name, description, prompt, type, isActive } = body;

    if (!name || !description || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // If this is being set as active, deactivate all other prompts
    if (isActive) {
      await db
        .collection("systemPrompts")
        .updateMany({}, { $set: { isActive: false } });
    }

    const newSystemPrompt: Omit<SystemPrompt, "_id"> = {
      name,
      description,
      prompt,
      type: type || "",
      isActive: isActive || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection("systemPrompts")
      .insertOne(newSystemPrompt);

    console.log("✅ POST /api/system-prompts: Successfully created prompt");
    return NextResponse.json({
      _id: result.insertedId,
      ...newSystemPrompt,
    });
  } catch (error) {
    console.error(
      "💥 POST /api/system-prompts: Error creating system prompt:",
      error
    );
    return NextResponse.json(
      { error: "Failed to create system prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update a system prompt
export async function PUT(request: NextRequest) {
  console.log("🔒 PUT /api/system-prompts: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ PUT /api/system-prompts: Authentication failed");
    return authResult;
  }

  try {
    const body = await request.json();
    const { id, name, description, prompt, type, isActive } = body;

    if (!id || !name || !description || !prompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // If this is being set as active, deactivate all other prompts
    if (isActive) {
      await db
        .collection("systemPrompts")
        .updateMany(
          { _id: { $ne: new ObjectId(id) } },
          { $set: { isActive: false } }
        );
    }

    const updateData = {
      name,
      description,
      prompt,
      type: type || "",
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

    console.log("✅ PUT /api/system-prompts: Successfully updated prompt");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 PUT /api/system-prompts: Error updating system prompt:",
      error
    );
    return NextResponse.json(
      { error: "Failed to update system prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a system prompt
export async function DELETE(request: NextRequest) {
  console.log("🔒 DELETE /api/system-prompts: Starting request");

  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    console.log("❌ DELETE /api/system-prompts: Authentication failed");
    return authResult;
  }

  try {
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

    console.log("✅ DELETE /api/system-prompts: Successfully deleted prompt");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "💥 DELETE /api/system-prompts: Error deleting system prompt:",
      error
    );
    return NextResponse.json(
      { error: "Failed to delete system prompt" },
      { status: 500 }
    );
  }
}
