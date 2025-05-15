import { MongoClient, ObjectId } from "mongodb";
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PUT, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Add PATCH handler to update the car's primaryImageId
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    const carId = params.id;

    if (!ObjectId.isValid(carId)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const { primaryImageId } = await request.json();

    if (!primaryImageId) {
      return NextResponse.json(
        { error: "primaryImageId is required" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    const DB_NAME = process.env.MONGODB_DB || "motive_archive";

    if (!MONGODB_URI) {
      throw new Error("MongoDB URI is not defined");
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Update the car's primaryImageId
    const result = await db
      .collection("cars")
      .updateOne(
        { _id: new ObjectId(carId) },
        { $set: { primaryImageId: primaryImageId } }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating primary image:", error);
    return NextResponse.json(
      { error: "Failed to update primary image" },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
