import { NextRequest, NextResponse } from "next/server";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch a specific system prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🔒 GET /api/system-prompts/[id]: Starting request");

  // Check authentication (no admin role required - system prompts are needed for caption generation)
  const authResult = await verifyAuthMiddleware(request, []);
  if (authResult) {
    console.log("❌ GET /api/system-prompts/[id]: Authentication failed");
    return authResult;
  }

  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

    console.log(
      "🔒 GET /api/system-prompts/[id]: Authentication successful, fetching prompt"
    );
    const { db } = await connectToDatabase();
    const systemPrompt = await db
      .collection("systemPrompts")
      .findOne({ _id: new ObjectId(id) });

    if (!systemPrompt) {
      return NextResponse.json(
        { error: "System prompt not found" },
        { status: 404 }
      );
    }

    console.log("✅ GET /api/system-prompts/[id]: Successfully fetched prompt");
    return NextResponse.json(systemPrompt);
  } catch (error) {
    console.error(
      "💥 GET /api/system-prompts/[id]: Error fetching system prompt:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch system prompt" },
      { status: 500 }
    );
  }
}
