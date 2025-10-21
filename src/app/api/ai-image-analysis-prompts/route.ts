import { NextRequest, NextResponse } from "next/server";
import AIImageAnalysisPrompt from "@/models/AIImageAnalysisPrompt";
import { dbConnect } from "@/lib/mongodb";
import {
  withFirebaseAuth,
  verifyAuthMiddleware,
} from "@/lib/firebase-auth-middleware";

// GET - Fetch all AI image analysis prompts
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const prompts = await AIImageAnalysisPrompt.find({}).sort({
      isDefault: -1,
      analysisType: 1,
      name: 1,
    });

    // Convert to plain objects and stringify ObjectIds
    const serializedPrompts = prompts.map((prompt) => ({
      ...prompt.toObject(),
      _id: prompt._id.toString(),
    }));

    return NextResponse.json(serializedPrompts);
  } catch (error) {
    console.error("Error fetching AI image analysis prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompts" },
      { status: 500 }
    );
  }
}

// POST - Create a new AI image analysis prompt
export async function POST(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    return authResult;
  }

  try {
    await dbConnect();
    const data = await request.json();
    const {
      name,
      description,
      analysisType,
      systemPrompt,
      userPromptTemplate,
      aiModel,
      llmProvider,
      isDefault,
      isActive,
      modelParams,
    } = data;

    // Validate required fields
    if (
      !name ||
      !description ||
      !analysisType ||
      !systemPrompt ||
      !userPromptTemplate ||
      !aiModel ||
      !llmProvider
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the new prompt
    const newPrompt = new AIImageAnalysisPrompt({
      name,
      description,
      analysisType,
      systemPrompt,
      userPromptTemplate,
      aiModel,
      llmProvider,
      isDefault: isDefault || false,
      isActive: isActive !== false,
      modelParams: modelParams || {},
    });

    await newPrompt.save();

    return NextResponse.json({
      ...newPrompt.toObject(),
      _id: newPrompt._id.toString(),
    });
  } catch (error) {
    console.error("Error creating AI image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to create prompt" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing AI image analysis prompt
export async function PUT(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    return authResult;
  }

  try {
    await dbConnect();
    const data = await request.json();
    const { _id, ...updateData } = data;

    if (!_id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    const updatedPrompt = await AIImageAnalysisPrompt.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedPrompt.toObject(),
      _id: updatedPrompt._id.toString(),
    });
  } catch (error) {
    console.error("Error updating AI image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to update prompt" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an AI image analysis prompt
export async function DELETE(request: NextRequest) {
  // Check authentication and admin role
  const authResult = await verifyAuthMiddleware(request, ["admin"]);
  if (authResult) {
    return authResult;
  }

  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    const deletedPrompt = await AIImageAnalysisPrompt.findByIdAndDelete(id);

    if (!deletedPrompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting AI image analysis prompt:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt" },
      { status: 500 }
    );
  }
}
