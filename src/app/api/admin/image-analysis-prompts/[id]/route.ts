import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

// GET - Fetch a specific image analysis prompt
async function getPrompt(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<object>> {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const db = await getDatabase();
    const prompt = await db
      .collection("imageAnalysisPrompts")
      .findOne({ _id: new ObjectId(id) });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...prompt,
      _id: prompt._id.toString(),
    });
  } catch (error) {
    console.error("Error fetching image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update a specific image analysis prompt
async function updatePrompt(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<object>> {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const { name, description, prompt, isDefault, isActive, category } =
      await request.json();

    // Validate required fields
    if (!name || !description || !prompt) {
      return NextResponse.json(
        { error: "Name, description, and prompt are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // If this is being set as default, unset other defaults
    if (isDefault) {
      await db
        .collection("imageAnalysisPrompts")
        .updateMany(
          { _id: { $ne: new ObjectId(id) } },
          { $set: { isDefault: false } }
        );
    }

    // Update the prompt
    const updateData = {
      name,
      description,
      prompt,
      isDefault: isDefault || false,
      isActive: isActive !== false,
      category: category || "general",
      updatedAt: new Date().toISOString(),
    };

    const result = await db
      .collection("imageAnalysisPrompts")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    // Fetch and return the updated prompt
    const updatedPrompt = await db
      .collection("imageAnalysisPrompts")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      ...updatedPrompt,
      _id: updatedPrompt!._id.toString(),
    });
  } catch (error) {
    console.error("Error updating image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific image analysis prompt
async function deletePrompt(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<object>> {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    const db = await getDatabase();

    // Check if this is the default prompt
    const prompt = await db
      .collection("imageAnalysisPrompts")
      .findOne({ _id: new ObjectId(id) });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    if (prompt.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default prompt" },
        { status: 400 }
      );
    }

    // Delete the prompt
    const result = await db
      .collection("imageAnalysisPrompts")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Prompt deleted successfully" });
  } catch (error) {
    console.error("Error deleting image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}

// Export with Firebase auth protection requiring admin role
export const GET = withFirebaseAuth(getPrompt, ["admin"]);
export const PUT = withFirebaseAuth(updatePrompt, ["admin"]);
export const DELETE = withFirebaseAuth(deletePrompt, ["admin"]);
