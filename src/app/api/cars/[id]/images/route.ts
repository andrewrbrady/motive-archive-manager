// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, UpdateFilter } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

interface ImageData {
  imageUrl: string;
  imageId: string;
  metadata?: any;
}

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId;
  createdAt: string;
  updatedAt: string;
}

interface CarDocument {
  _id: ObjectId;
  imageIds: string[];
  updatedAt?: string;
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

    const {
      imageUrl,
      imageId,
      metadata = {},
    } = JSON.parse(imageData as string) as ImageData;
    console.log("Received image data:", { imageUrl, imageId });

    const db = await getDatabase();
    const carsCollection = db.collection<CarDocument>("cars");
    const imagesCollection = db.collection<Image>("images");

    // Create new image document
    const imageDoc = {
      _id: new ObjectId(),
      cloudflareId: imageId,
      url: imageUrl,
      filename: imageUrl.split("/").pop() || "",
      metadata,
      carId: new ObjectId(id),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert the image document
    await imagesCollection.insertOne(imageDoc);
    console.log("Created new image document:", imageDoc._id);

    // Update the car document with the new image ID
    const updateDoc: UpdateFilter<CarDocument> = {
      $push: { imageIds: imageDoc._id.toString() },
      $set: { updatedAt: new Date().toISOString() },
    };

    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      updateDoc
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

    // Get the updated car document with populated images
    const updatedCar = await carsCollection
      .aggregate([
        { $match: { _id: new ObjectId(id) } },
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
  let mongoClient: MongoClient | null = null;
  try {
    const id = await context.params.id;
    const { imageUrl, deleteFromStorage } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    mongoClient = await MongoClient.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
    );
    const database = mongoClient.db("motive_archive");
    const imagesCollection = database.collection<Image>("images");
    const carsCollection = database.collection<CarDocument>("cars");

    // First, get the image details
    const image = await imagesCollection.findOne({ url: imageUrl });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Remove the image ID from the car document
    const pullDoc: UpdateFilter<CarDocument> = {
      $pull: { imageIds: image._id.toString() },
      $set: { updatedAt: new Date().toISOString() },
    };

    const result = await carsCollection.updateOne(
      { _id: new ObjectId(id) },
      pullDoc
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Delete the image document from MongoDB
    await imagesCollection.deleteOne({ _id: image._id });

    // Return success early to update UI state
    const response = NextResponse.json({ success: true });

    // If deleteFromStorage is true, delete from Cloudflare after response is sent
    if (deleteFromStorage && image.cloudflareId) {
      // Delete from Cloudflare in the background
      fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${image.cloudflareId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      ).catch((error) => {
        console.error("Error deleting from Cloudflare:", error);
        // Log error but don't affect response
      });
    }

    return response;
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}
