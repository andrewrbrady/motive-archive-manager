import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import { getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { getFormattedImageUrl } from "@/lib/cloudflare";

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = context.params;

    console.log(`Image sync request for car ID: ${id}`);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    client = await getMongoClient();
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db(DB_NAME);

    // Convert the ID to ObjectId
    let carObjectId;
    try {
      carObjectId = new ObjectId(id);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid car ID format" },
        { status: 400 }
      );
    }

    // Always use ObjectId for MongoDB query
    let car = await db.collection("cars").findOne({ _id: carObjectId });
    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    console.log(`Found car: ${car._id}`);

    if (
      !car.imageIds ||
      !Array.isArray(car.imageIds) ||
      car.imageIds.length === 0
    ) {
      return NextResponse.json(
        { error: "Car has no image IDs" },
        { status: 400 }
      );
    }

    // 2. Convert all string IDs to ObjectId
    const imageObjectIds = car.imageIds
      .filter((imgId: string) => ObjectId.isValid(imgId))
      .map((imgId: string) => new ObjectId(imgId));

    console.log(`Converted ${imageObjectIds.length} image IDs to ObjectIds`);

    // 3. Find all existing images that match these IDs
    const existingImages = await db
      .collection("images")
      .find({ _id: { $in: imageObjectIds } })
      .toArray();

    console.log(
      `Found ${existingImages.length} existing images out of ${car.imageIds.length} imageIds`
    );

    // 4. Find all image IDs that don't have a corresponding image document
    const existingImageIds = new Set(
      existingImages.map((img) => img._id.toString())
    );
    const missingImageIds = car.imageIds.filter(
      (imgId: string) => !existingImageIds.has(imgId)
    );

    console.log(`Missing image IDs count: ${missingImageIds.length}`);

    if (missingImageIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All images are already synchronized",
        existingImages: existingImages.length,
        missingImages: 0,
      });
    }

    // 5. Create dummy image documents for missing images
    const now = new Date().toISOString();
    const carId = car._id instanceof ObjectId ? car._id : new ObjectId(car._id);

    const dummyImages = missingImageIds.map((imgId: string) => ({
      _id: new ObjectId(imgId),
      carId: carId,
      url: `https://imagedelivery.net/veo1agD2ekS5yYAVWyZXBA/${imgId}/public`,
      filename: `Image ${imgId.substring(0, 6)}`,
      metadata: {
        category: "exterior",
        isPrimary: car.primaryImageId === imgId,
      },
      createdAt: now,
      updatedAt: now,
    }));

    console.log(`Created ${dummyImages.length} dummy image records`);

    try {
      // 6. Insert the dummy image documents
      const insertResult = await db
        .collection("images")
        .insertMany(dummyImages);
      console.log(
        `Successfully inserted ${insertResult.insertedCount} dummy images`
      );

      // 7. Return success response
      return NextResponse.json({
        success: true,
        message: `Successfully synchronized images`,
        existingImages: existingImages.length,
        createdImages: insertResult.insertedCount,
        totalImages: existingImages.length + insertResult.insertedCount,
      });
    } catch (insertError) {
      console.error("Error inserting dummy images:", insertError);
      return NextResponse.json(
        {
          error: "Failed to insert dummy images",
          details: String(insertError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error syncing car images:", error);
    return NextResponse.json(
      { error: "Failed to sync car images", details: String(error) },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
