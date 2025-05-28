import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

// GET - Fetch all image analysis prompts
async function getPrompts(request: NextRequest): Promise<NextResponse<object>> {
  try {
    const db = await getDatabase();
    const prompts = await db
      .collection("imageAnalysisPrompts")
      .find({})
      .sort({ isDefault: -1, name: 1 })
      .toArray();

    // Convert ObjectIds to strings
    const serializedPrompts = prompts.map((prompt) => ({
      ...prompt,
      _id: prompt._id.toString(),
    }));

    return NextResponse.json(serializedPrompts);
  } catch (error) {
    console.error("Error fetching image analysis prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST - Create a new image analysis prompt
async function createPrompt(
  request: NextRequest
): Promise<NextResponse<object>> {
  try {
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
        .updateMany({}, { $set: { isDefault: false } });
    }

    // Create the new prompt
    const newPrompt = {
      name,
      description,
      prompt,
      isDefault: isDefault || false,
      isActive: isActive !== false, // Default to true if not specified
      category: category || "general",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await db
      .collection("imageAnalysisPrompts")
      .insertOne(newPrompt);

    return NextResponse.json({
      _id: result.insertedId.toString(),
      ...newPrompt,
    });
  } catch (error) {
    console.error("Error creating image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

// Export with Firebase auth protection requiring admin role
export const GET = withFirebaseAuth(getPrompts, ["admin"]);
export const POST = withFirebaseAuth(createPrompt, ["admin"]);
