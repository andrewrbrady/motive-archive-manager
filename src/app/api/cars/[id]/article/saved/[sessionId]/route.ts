import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE a saved article by sessionId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const { id: carId, sessionId } = params;
    const db = await getDatabase();

    const result = await db.collection("saved_articles").deleteOne({
      "metadata.carId": carId,
      "metadata.sessionId": sessionId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Saved article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved article:", error);
    return NextResponse.json(
      { error: "Failed to delete saved article" },
      { status: 500 }
    );
  }
}
