import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const DB_NAME = process.env.MONGODB_DB || "motive_archive";

// GET documents for a car
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    // Get and validate ID first, before any other operations
    const { id } = await Promise.resolve(context.params);
    console.log(`Fetching documents for car ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      console.log(`Invalid car ID format: ${id}`);
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

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
      { error: "Failed to fetch car documents" },
      { status: 500 }
    );
  }
}
