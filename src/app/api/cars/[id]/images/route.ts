// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);

interface ImageData {
  imageUrl: string;
  imageId: string;
}

interface CarImage {
  id: string;
  url: string;
  filename: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CarDocument {
  _id: ObjectId;
  images: CarImage[];
}

let isConnected = false;

async function connectToDatabase() {
  try {
    if (!isConnected) {
      await client.connect();
      isConnected = true;
      console.log("Connected to MongoDB");
    }
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
    console.log("Processing request for car ID:", id);

    const formData = await request.formData();
    const imageData = formData.get("imageData");

    if (!imageData) {
      console.error("No image data provided in request");
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    const { imageUrl, imageId } = JSON.parse(imageData as string) as ImageData;
    console.log("Received image data:", { imageUrl, imageId });

    await connectToDatabase();
    const database = client.db("motive_archive");
    const collection = database.collection<CarDocument>("cars");

    const newImage: CarImage = {
      id: imageId,
      url: imageUrl,
      filename: imageUrl.split("/").pop() || "",
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("Attempting to add new image to car:", newImage);

    // Update the car document with the new image
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $push: { images: newImage } }
    );

    console.log("MongoDB update result:", result);

    if (result.matchedCount === 0) {
      console.error("Car not found with ID:", id);
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    if (result.modifiedCount === 0) {
      console.error("Car found but not modified:", id);
      return NextResponse.json(
        { error: "Failed to update car" },
        { status: 500 }
      );
    }

    // Get the updated car document
    const updatedCar = await collection.findOne({ _id: new ObjectId(id) });
    console.log("Updated car document:", updatedCar);

    return NextResponse.json(updatedCar);
  } catch (error) {
    console.error("Error in POST /api/cars/[id]/images:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: Promise<string> } }
) {
  try {
    const id = await context.params.id;
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    await client.connect();
    const database = client.db("motive_archive");
    const collection = database.collection<CarDocument>("cars");

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: { url: imageUrl } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}
