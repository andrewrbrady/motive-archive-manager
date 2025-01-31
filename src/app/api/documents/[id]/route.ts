import { NextResponse } from "next/server";
import { Collection, ObjectId, UpdateFilter } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

interface Document {
  _id: ObjectId;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  updatedAt: string;
}

interface Car {
  _id: ObjectId;
  documents: ObjectId[];
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const documentsCollection: Collection<Document> =
      db.collection("documents");

    const document = await documentsCollection.findOne({
      _id: new ObjectId(id),
    });

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid document ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!body.carId || !ObjectId.isValid(body.carId)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const documentsCollection: Collection<Document> =
      db.collection("documents");
    const carsCollection: Collection<Car> = db.collection("cars");

    // Delete the document
    const documentId = new ObjectId(id);
    const result = await documentsCollection.deleteOne({
      _id: documentId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Update the car to remove the document reference
    const updateDoc: UpdateFilter<Car> = {
      $pull: {
        documents: documentId,
      },
      $set: {
        updatedAt: new Date().toISOString(),
      },
    };

    await carsCollection.updateOne(
      { _id: new ObjectId(body.carId) },
      updateDoc
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
