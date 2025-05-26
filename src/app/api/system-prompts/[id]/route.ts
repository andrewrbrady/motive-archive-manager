import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Fetch a specific system prompt by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid prompt ID" }, { status: 400 });
    }

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

    return NextResponse.json(systemPrompt);
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    return NextResponse.json(
      { error: "Failed to fetch system prompt" },
      { status: 500 }
    );
  }
}
