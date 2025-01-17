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
  context: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    const db = client.db(DB_NAME);
    const car = await db.collection("cars").findOne({
      _id: objectId,
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json(car);
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  } finally {
    await client.close();
  }
}

// PUT/PATCH to update car information
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);
    const updates = await request.json();

    // Remove _id from updates if present to prevent MongoDB errors
    delete updates._id;

    const db = client.db(DB_NAME);
    const result = await db
      .collection("cars")
      .updateOne({ _id: objectId }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Fetch and return the updated car
    const updatedCar = await db.collection("cars").findOne({
      _id: objectId,
    });

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Error updating car:", error);
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
  context: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);
    const db = client.db(DB_NAME);

    // First, get the car to check if it exists and get associated documents
    const car = await db.collection("cars").findOne({
      _id: objectId,
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Delete associated documents if they exist
    if (car.documents?.length > 0) {
      await db.collection("receipts").deleteMany({
        _id: { $in: car.documents.map((docId: string) => new ObjectId(docId)) },
      });
    }

    // Delete the car
    await db.collection("cars").deleteOne({
      _id: objectId,
    });

    return NextResponse.json({
      message: "Car and associated documents deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// PATCH to remove a specific document from a car or update images
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);
    const body = await request.json();
    const { documentId, images, ...updates } = body;
    const db = client.db(DB_NAME);

    // Handle document removal
    if (documentId) {
      if (!ObjectId.isValid(documentId)) {
        return NextResponse.json(
          { error: "Invalid document ID format" },
          { status: 400 }
        );
      }
      const docObjectId = new ObjectId(documentId);

      // Remove document reference from car
      const updateResult = await db
        .collection("cars")
        .updateOne({ _id: objectId }, { $pull: { documents: documentId } });

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Delete the document from receipts collection
      await db.collection("receipts").deleteOne({
        _id: docObjectId,
      });

      return NextResponse.json({ message: "Document removed successfully" });
    }

    // Handle image updates
    if (images) {
      if (!Array.isArray(images)) {
        return NextResponse.json(
          { error: "Invalid images array provided" },
          { status: 400 }
        );
      }

      const updateResult = await db
        .collection("cars")
        .updateOne({ _id: objectId }, { $set: { images } });

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Fetch the updated car to return the new state
      const updatedCar = await db.collection("cars").findOne({
        _id: objectId,
      });

      return NextResponse.json(updatedCar);
    }

    // Handle general car data updates
    if (Object.keys(updates).length > 0) {
      const updateResult = await db
        .collection("cars")
        .updateOne({ _id: objectId }, { $set: updates });

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Fetch the updated car to return the new state
      const updatedCar = await db.collection("cars").findOne({
        _id: objectId,
      });

      return NextResponse.json(updatedCar);
    }

    return NextResponse.json(
      { error: "No valid operation specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating car:", error);
    return NextResponse.json(
      { error: "Failed to update car" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
