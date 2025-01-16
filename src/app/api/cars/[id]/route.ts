import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const MONGODB_URI = "mongodb://localhost:27017";
const DB_NAME = "motive_archive";

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  return client;
}

// GET car by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const db = client.db(DB_NAME);
    const car = await db.collection("cars").findOne({
      _id: new ObjectId(params.id),
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json(car);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// PUT/PATCH to update car information
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const updates = await request.json();

    // Remove _id from updates if present to prevent MongoDB errors
    delete updates._id;

    const db = client.db(DB_NAME);
    const result = await db
      .collection("cars")
      .updateOne({ _id: new ObjectId(params.id) }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Car updated successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// DELETE car
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const db = client.db(DB_NAME);

    // First, get the car to check if it exists and get associated documents
    const car = await db.collection("cars").findOne({
      _id: new ObjectId(params.id),
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Delete associated documents if they exist
    if (car.documents?.length > 0) {
      await db.collection("receipts").deleteMany({
        _id: { $in: car.documents.map((id: string) => new ObjectId(id)) },
      });
    }

    // Delete the car
    await db.collection("cars").deleteOne({
      _id: new ObjectId(params.id),
    });

    return NextResponse.json({
      message: "Car and associated documents deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// PATCH to remove a specific document from a car
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { documentId } = await request.json();
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    const db = client.db(DB_NAME);

    // Remove document reference from car
    const updateResult = await db
      .collection("cars")
      .updateOne(
        { _id: new ObjectId(params.id) },
        { $pull: { documents: new ObjectId(documentId) } }
      );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Delete the document from receipts collection
    await db.collection("receipts").deleteOne({
      _id: new ObjectId(documentId),
    });

    return NextResponse.json({ message: "Document removed successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to remove document" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
