import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI as string, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  return client;
}

// GET documents for a car
export async function GET(request: Request) {
  let client;
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2]; // -2 because URL is /cars/[id]/documents

    console.log(`Fetching documents for car ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.log(`Invalid car ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    // Connect to MongoDB after ID validation
    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Get the car to check if it exists and get document references
    console.log(`Looking up car: ${id}`);
    const car = await db
      .collection("cars")
      .findOne({ _id: objectId }, { projection: { documents: 1 } });

    if (!car) {
      console.log(`Car not found: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // If car has no documents field or it's empty, return empty array immediately
    if (
      !car.documents ||
      !Array.isArray(car.documents) ||
      car.documents.length === 0
    ) {
      console.log(`No documents found for car: ${id}`);
      return NextResponse.json([]);
    }

    // Filter out any invalid document IDs and convert to ObjectIds
    console.log(`Processing ${car.documents.length} document references`);
    const documentIds = car.documents
      .filter((docId: string) => docId && ObjectId.isValid(docId))
      .map((docId: string) => new ObjectId(docId));

    // If no valid document IDs after filtering, return empty array
    if (documentIds.length === 0) {
      console.log(`No valid document IDs found for car: ${id}`);
      return NextResponse.json([]);
    }

    // Fetch all documents
    console.log(`Fetching ${documentIds.length} documents`);
    const documents = await db
      .collection("receipts")
      .find({ _id: { $in: documentIds } })
      .toArray();

    console.log(`Successfully retrieved ${documents.length} documents`);
    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching car documents:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch car documents",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      // Safe access to segments in finally block
      const id = request.url
        ? new URL(request.url).pathname.split("/").at(-2)
        : "unknown";
      console.log(`Closing MongoDB connection for car documents ${id}`);
      await client.close();
    }
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
