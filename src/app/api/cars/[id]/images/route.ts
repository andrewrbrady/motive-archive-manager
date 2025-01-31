// Location: app/api/cars/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

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

interface Car {
  _id: ObjectId;
  imageIds: ObjectId[];
  updatedAt: string;
}

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    const formData = await request.formData();
    const imageData = formData.get("imageData");

    if (!imageData) {
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

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const carsCollection: Collection<Car> = db.collection("cars");
    const imagesCollection: Collection<Image> = db.collection("images");

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

    // Execute database operations in parallel
    const [insertResult, updateResult] = await Promise.all([
      imagesCollection.insertOne(imageDoc),
      carsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $push: { imageIds: imageDoc._id },
          $set: { updatedAt: new Date().toISOString() },
        },
        {
          returnDocument: "after",
          projection: { imageIds: 1 },
        }
      ),
    ]);

    if (!updateResult) {
      await imagesCollection.deleteOne({ _id: imageDoc._id });
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    // Get the newly added image with the car's images
    const images = await imagesCollection
      .find(
        { _id: { $in: updateResult.imageIds } },
        {
          projection: {
            cloudflareId: 1,
            url: 1,
            filename: 1,
            metadata: 1,
            createdAt: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      images: images.map((img) => ({
        ...img,
        _id: img._id.toString(),
        carId: id,
      })),
    });
  } catch (error) {
    console.error("Error in POST /api/cars/[id]/images:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let dbConnection;
  try {
    const { id } = context.params;
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const carsCollection: Collection<Car> = db.collection("cars");
    const imagesCollection: Collection<Image> = db.collection("images");

    // Find the image using the indexed url field
    const image = await imagesCollection.findOne(
      { url: imageUrl },
      { projection: { _id: 1 } }
    );

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Execute delete operations in parallel
    const [updateResult, deleteResult] = await Promise.all([
      carsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $pull: { imageIds: image._id },
          $set: { updatedAt: new Date().toISOString() },
        }
      ),
      imagesCollection.deleteOne({ _id: image._id }),
    ]);

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedImageId: image._id.toString(),
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
