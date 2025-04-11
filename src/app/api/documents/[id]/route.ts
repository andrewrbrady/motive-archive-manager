import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1]; // /documents/[id]

    // Validate document ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Find document by ID
    const document = await db.collection("documents").findOne({
      _id: new ObjectId(id),
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Return document with string IDs
    return NextResponse.json({
      ...document,
      id: document._id.toString(),
      carId: document.carId ? document.carId.toString() : null,
      clientId: document.clientId ? document.clientId.toString() : null,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 1];

    // Validate document ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Delete document
    const result = await db.collection("documents").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
