// app/api/documents/[id]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId, UpdateFilter } from "mongodb";

interface CarDocument {
  _id: ObjectId;
  documents: ObjectId[];
}

// Helper function to safely get ID
const getDocumentId = async (params: { id: string }) => {
  // This ensures params.id is properly handled
  const segment = params.id;
  if (!segment) throw new Error("Document ID is required");
  return segment;
};

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get ID safely
    const documentId = await getDocumentId(context.params);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");

    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const documentId = await getDocumentId(context.params);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const updateData = await request.json();

    const result = await db
      .collection("documents")
      .findOneAndUpdate(
        { _id: new ObjectId(documentId) },
        { $set: updateData },
        { returnDocument: "after" }
      );

    if (!result) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Update failed:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const documentId = await getDocumentId(context.params);

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");

    const body = await request.json();

    // Find document
    const document = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(documentId) });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update car
    const updateDoc: UpdateFilter<CarDocument> = {
      $pull: {
        documents: documentId,
      },
    };

    await db
      .collection<CarDocument>("cars")
      .updateOne({ _id: new ObjectId(body.carId) }, updateDoc);

    // Delete document
    const result = await db
      .collection("documents")
      .deleteOne({ _id: new ObjectId(documentId) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Document deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete operation failed:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
