import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { getDatabase } from "@/lib/mongodb";

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const templateName = decodeURIComponent(segments[segments.length - 1]);

    const db = await getDatabase();
    const collection = db.collection("event_templates");

    const result = await collection.deleteOne({ name: templateName });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
