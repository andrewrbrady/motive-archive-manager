import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const db = await getDatabase();
    const collection = db.collection("event_templates");
    const name = decodeURIComponent(params.name);

    const result = await collection.deleteOne({ name });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
