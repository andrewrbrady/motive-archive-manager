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

// GET documents for a car
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // Get and validate ID first, before any other operations
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    // Connect to MongoDB after ID validation
    const client = await getMongoClient();
    try {
      const db = client.db(DB_NAME);

      // Get the car to check if it exists and get document references
      const car = await db
        .collection("cars")
        .findOne({ _id: objectId }, { projection: { documents: 1 } });

      if (!car) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // If car has no documents field or it's empty, return empty array
      if (
        !car.documents ||
        !Array.isArray(car.documents) ||
        car.documents.length === 0
      ) {
        return NextResponse.json([]);
      }

      // Filter out any invalid document IDs and convert to ObjectIds
      const documentIds = car.documents
        .filter((docId: string) => docId && ObjectId.isValid(docId))
        .map((docId: string) => new ObjectId(docId));

      // If no valid document IDs, return empty array
      if (documentIds.length === 0) {
        return NextResponse.json([]);
      }

      // Fetch all documents
      const documents = await db
        .collection("receipts")
        .find({ _id: { $in: documentIds } })
        .toArray();

      return NextResponse.json(documents);
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("Error fetching car documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch car documents" },
      { status: 500 }
    );
  }
}
