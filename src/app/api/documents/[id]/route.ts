import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId, WithId, UpdateFilter } from "mongodb";

interface CarDocument {
  _id: ObjectId;
  documents: ObjectId[];
}

type _Car = WithId<CarDocument>;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = await Promise.resolve(params.id);
  try {
    const db = await getDatabase();
    const receipt = await db
      .collection("documents")
      .findOne({ _id: new ObjectId(id) });
    if (!receipt) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(params.id);

    // Validate ID format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const documentId = new ObjectId(id);
    const db = await getDatabase();

    // Get request body for carId
    const body = await request.json();

    // First, find the document to ensure it exists
    const document = await db
      .collection("documents")
      .findOne({ _id: documentId });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update the car to remove the document reference
    const updateDoc: UpdateFilter<CarDocument> = {
      $pull: {
        documents: documentId,
      },
    };

    const cars = db.collection<CarDocument>("cars");
    await cars.updateOne({ _id: new ObjectId(body.carId) }, updateDoc);

    // Delete the document
    const result = await db
      .collection("documents")
      .deleteOne({ _id: documentId });

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
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
