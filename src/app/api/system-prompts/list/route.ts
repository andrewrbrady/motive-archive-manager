import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";

// GET - Fetch system prompts for selection (non-admin endpoint)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const length = searchParams.get("length");

    const { db } = await connectToDatabase();

    // Build query filter - removed type filtering
    const filter: any = {};

    // If length is specified, include prompts that either match the length or have no length specified (general prompts)
    if (length) {
      filter.$or = [
        { length: length },
        { length: { $exists: false } },
        { length: null },
        { length: "" },
      ];
    }

    const systemPrompts = await db
      .collection("systemPrompts")
      .find(filter)
      .sort({ name: 1 })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        type: 1,
        length: 1,
        isActive: 1,
      })
      .toArray();

    return NextResponse.json(systemPrompts);
  } catch (error) {
    console.error("Error fetching system prompts for selection:", error);
    return NextResponse.json(
      { error: "Failed to fetch system prompts" },
      { status: 500 }
    );
  }
}
