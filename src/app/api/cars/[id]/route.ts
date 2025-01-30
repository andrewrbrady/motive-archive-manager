import { MongoClient, ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { ImageMetadata } from "@/lib/cloudflare";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || "motive_archive";

if (!MONGODB_URI) {
  throw new Error("Please add your Mongo URI to .env.local");
}

interface Car {
  _id: ObjectId;
  documents: string[];
  imageIds: ObjectId[];
  client?: string;
  clientInfo?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
  };
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: ImageMetadata;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get MongoDB client
async function getMongoClient() {
  const client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  return client;
}

// GET car by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Fetching car with ID: ${id}`);
    // Use aggregation to populate images
    const car = (await db
      .collection("cars")
      .aggregate([
        { $match: { _id: objectId } },
        {
          $lookup: {
            from: "images",
            localField: "imageIds",
            foreignField: "_id",
            as: "images",
          },
        },
      ])
      .next()) as Car | null;

    if (!car) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // If the car has a client field, populate the client information
    if (car.client && ObjectId.isValid(car.client)) {
      console.log(`Fetching client info for car ${id}`);
      const clientDoc = await db.collection("clients").findOne({
        _id: new ObjectId(car.client),
      });

      if (clientDoc) {
        car.clientInfo = {
          _id: clientDoc._id.toString(),
          name: clientDoc.name,
          email: clientDoc.email,
          phone: clientDoc.phone,
          address: clientDoc.address,
        };
      }
    }

    return NextResponse.json(car);
  } catch (error) {
    console.error("Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  } finally {
    if (client) {
      console.log(`Closing MongoDB connection for car ${context.params.id}`);
      await client.close();
    }
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
      .collection<Car>("cars")
      .updateOne({ _id: objectId }, { $set: updates });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Fetch and return the updated car
    const updatedCar = await db.collection<Car>("cars").findOne({
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
  let client;
  try {
    const { id } = context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }
    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Deleting car with ID: ${id}`);
    const result = await db.collection("cars").deleteOne({
      _id: objectId,
    });

    if (result.deletedCount === 0) {
      console.log(`Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting car:", error);
    return NextResponse.json(
      { error: "Failed to delete car" },
      { status: 500 }
    );
  } finally {
    if (client) {
      console.log(`Closing MongoDB connection for car ${context.params.id}`);
      await client.close();
    }
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
        .collection<Car>("cars")
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

      // Convert image IDs to ObjectIds
      const imageIds = images.map((image) => new ObjectId(image._id));

      const updateResult = await db
        .collection<Car>("cars")
        .updateOne({ _id: objectId }, { $set: { imageIds } });

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Fetch the updated car with populated images
      const updatedCar = await db
        .collection("cars")
        .aggregate([
          { $match: { _id: objectId } },
          {
            $lookup: {
              from: "images",
              localField: "imageIds",
              foreignField: "_id",
              as: "images",
            },
          },
        ])
        .next();

      return NextResponse.json(updatedCar);
    }

    // Handle general car data updates
    if (Object.keys(updates).length > 0) {
      const updateResult = await db
        .collection<Car>("cars")
        .updateOne({ _id: objectId }, { $set: updates });

      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }

      // Fetch the updated car with populated images
      const updatedCar = await db
        .collection("cars")
        .aggregate([
          { $match: { _id: objectId } },
          {
            $lookup: {
              from: "images",
              localField: "imageIds",
              foreignField: "_id",
              as: "images",
            },
          },
        ])
        .next();

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
