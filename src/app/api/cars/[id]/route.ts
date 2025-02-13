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

interface UpdateBody {
  documentId?: string;
  images?: any[];
  [key: string]: any;
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

    console.error(`[DEBUG] GET - Fetching car with ID: ${id}`);
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
      console.error(`[DEBUG] GET - Car not found with ID: ${id}`);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    console.error("[DEBUG] GET - Initial car data:", {
      _id: car._id.toString(),
      client: car.client ? car.client.toString() : undefined,
      clientInfo: car.clientInfo || {
        _id: "",
        name: "",
        email: "",
        phone: "",
        address: "",
      },
    });

    // If the car has a client field, populate the client information
    if (car.client && ObjectId.isValid(car.client)) {
      console.error(
        `[DEBUG] GET - Fetching client info for car ${id}, client ID: ${car.client}`
      );
      const clientDoc = await db.collection("clients").findOne({
        _id: new ObjectId(car.client.toString()),
      });

      if (clientDoc) {
        car.clientInfo = {
          _id: clientDoc._id.toString(),
          name: clientDoc.name || "",
          email: clientDoc.email || "",
          phone: clientDoc.phone || "",
          address: clientDoc.address || "",
        };
        console.error(
          "[DEBUG] GET - Updated car with client info:",
          car.clientInfo
        );
      }
    }

    return NextResponse.json(car);
  } catch (error) {
    console.error("[DEBUG] GET - Error fetching car:", error);
    return NextResponse.json({ error: "Failed to fetch car" }, { status: 500 });
  } finally {
    if (client) {
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

// Helper function to clean aiAnalysis
function cleanAiAnalysis(car: any) {
  if (!car.aiAnalysis) return car;

  // Remove redundant fields that we already have structured data for
  const cleanedAnalysis = Object.fromEntries(
    Object.entries(car.aiAnalysis).filter(([key]) => {
      return (
        !key.toLowerCase().includes("gvwr") &&
        !key.toLowerCase().includes("weight") &&
        !key.toLowerCase().includes("engine") &&
        !key.toLowerCase().includes("doors") &&
        !key.toLowerCase().includes("displacement") &&
        !key.toLowerCase().includes("horsepower") &&
        !key.toLowerCase().includes("tire")
      );
    })
  );

  // If there are no fields left, remove the aiAnalysis object entirely
  if (Object.keys(cleanedAnalysis).length === 0) {
    delete car.aiAnalysis;
  } else {
    car.aiAnalysis = cleanedAnalysis;
  }

  return car;
}

// PATCH to update car information
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const client = await getMongoClient();
  try {
    let requestBody: UpdateBody = {};
    try {
      requestBody = await request.json();
    } catch (e) {
      // No body provided, that's ok for cleanup
    }

    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    const { documentId, images, ...updates } = requestBody;

    const objectId = new ObjectId(id);
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

    // Clean up aiAnalysis if this is a normal update or cleanup request
    if (!documentId && !images) {
      const car = await db.collection("cars").findOne({ _id: objectId });
      if (car) {
        const cleanedCar = cleanAiAnalysis(car);
        await db
          .collection("cars")
          .updateOne({ _id: objectId }, { $set: cleanedCar });

        // Return the cleaned car
        const updatedCar = await db
          .collection("cars")
          .findOne({ _id: objectId });
        return NextResponse.json(updatedCar);
      }
    }

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
      console.error("[DEBUG] PATCH - Updating car with data:", updates);

      // Convert client ID to ObjectId if present
      if (updates.client) {
        if (ObjectId.isValid(updates.client)) {
          updates.client = new ObjectId(updates.client);
        } else {
          delete updates.client; // Remove invalid client ID
        }
      }

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

      console.error("[DEBUG] PATCH - After update - Car data:", {
        _id: updatedCar._id,
        client: updatedCar.client,
        clientInfo: updatedCar.clientInfo,
      });

      // If the car has a client field, populate the client information
      if (updatedCar.client && ObjectId.isValid(updatedCar.client)) {
        console.error(
          "[DEBUG] PATCH - Fetching client info for client ID:",
          updatedCar.client
        );
        const clientDoc = await db.collection("clients").findOne({
          _id: new ObjectId(updatedCar.client.toString()),
        });

        console.error("[DEBUG] PATCH - Found client document:", clientDoc);

        if (clientDoc) {
          updatedCar.clientInfo = {
            _id: clientDoc._id.toString(),
            name: clientDoc.name,
            email: clientDoc.email,
            phone: clientDoc.phone,
            address: clientDoc.address,
          };
        }
      }

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
