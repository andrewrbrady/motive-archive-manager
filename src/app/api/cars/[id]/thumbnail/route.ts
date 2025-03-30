import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";

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

// PUT to update the primary thumbnail of a car
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);

    // Validate car ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { primaryImageId } = body;

    // Validate primaryImageId
    if (!primaryImageId || typeof primaryImageId !== "string") {
      return NextResponse.json(
        { error: "Primary image ID is required and must be a string" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    client = await getMongoClient();
    const db = client.db(DB_NAME);

    // Check if car exists
    const carObjectId = new ObjectId(id);
    const car = await db.collection("cars").findOne({ _id: carObjectId });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Check if the image exists in the car's imageIds
    const imageExists = car.imageIds && car.imageIds.includes(primaryImageId);

    if (!imageExists) {
      // Check if the image exists in the images collection and belongs to this car
      const imageObjectId = new ObjectId(primaryImageId);
      const image = await db.collection("images").findOne({
        _id: imageObjectId,
        carId: carObjectId,
      });

      if (!image) {
        return NextResponse.json(
          { error: "Image does not exist or does not belong to this car" },
          { status: 400 }
        );
      }
    }

    // Update the car with the primary image ID as ObjectId
    const result = await db.collection("cars").updateOne(
      { _id: carObjectId },
      {
        $set: {
          primaryImageId: new ObjectId(primaryImageId),
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Failed to update primary image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Primary image updated successfully",
    });
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
