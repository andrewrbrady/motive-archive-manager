import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { withFirebaseAuth } from "@/lib/firebase-auth-middleware";

async function getActivePrompts(
  request: NextRequest
): Promise<NextResponse<object>> {
  try {
    const db = await getDatabase();

    // Fetch only active prompts, sorted by default first, then by name
    const prompts = await db
      .collection("imageAnalysisPrompts")
      .find({ isActive: true })
      .sort({ isDefault: -1, name: 1 })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        category: 1,
        isDefault: 1,
      })
      .toArray();

    // Convert ObjectId to string for JSON serialization
    const serializedPrompts = prompts.map((prompt) => ({
      ...prompt,
      _id: prompt._id.toString(),
    }));

    return NextResponse.json(serializedPrompts);
  } catch (error) {
    console.error("Error fetching active image analysis prompts:", error);
    return NextResponse.json(
      { error: "Failed to fetch active prompts" },
      { status: 500 }
    );
  }
}

// Export with Firebase auth protection - any authenticated user can access
export const GET = withFirebaseAuth(getActivePrompts);
