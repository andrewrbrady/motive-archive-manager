// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { ImageMetadata } from "@/lib/cloudflare";

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
  metadata: ImageMetadata;
  createdAt: string;
  updatedAt: string;
}

interface CarDocument {
  _id: ObjectId;
  images: CarImage[];
}

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
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
      metadata: {} as ImageMetadata,
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
    const { imageUrl, deleteFromStorage } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    await client.connect();
    const database = client.db("motive_archive");
    const collection = database.collection<CarDocument>("cars");

    // First, get the image details from the car
    const car = await collection.findOne({ _id: new ObjectId(id) });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    const image = car.images.find((img) => img.url === imageUrl);
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Remove the image from the car document
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $pull: { images: { url: imageUrl } } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // If deleteFromStorage is true, delete from Cloudflare
    if (deleteFromStorage && image.id) {
      try {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          console.error(
            "Failed to delete image from Cloudflare:",
            await response.text()
          );
          return NextResponse.json(
            { error: "Failed to delete image from storage" },
            { status: 500 }
          );
        }
      } catch (error) {
        console.error("Error deleting from Cloudflare:", error);
        return NextResponse.json(
          { error: "Failed to delete image from storage" },
          { status: 500 }
        );
      }
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
