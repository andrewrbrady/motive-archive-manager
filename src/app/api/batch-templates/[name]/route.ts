import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { db } = await connectToDatabase();
    const { name } = params;

    const result = await db
      .collection("batch_templates")
      .deleteOne({ name: decodeURIComponent(name) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting batch template:", error);
    return NextResponse.json(
      { error: "Failed to delete batch template" },
      { status: 500 }
    );
  }
}
