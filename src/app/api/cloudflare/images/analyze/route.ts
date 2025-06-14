import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId, Collection } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { analyzeImage } from "@/lib/imageAnalyzer";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Image {
  _id: ObjectId;
  cloudflareId: string;
  url: string;
  filename: string;
  metadata: any;
  carId: ObjectId | null;
  createdAt: string;
  updatedAt: string;
}

interface Car {
  _id: ObjectId;
  imageIds: ObjectId[];
  updatedAt: string;
  make: string;
  model: string;
  year: string;
  color: string;
  engine: string;
  condition: string;
  description: string;
}

interface Gallery {
  _id: ObjectId;
  imageIds: ObjectId[];
  updatedAt: string;
}

interface Collections {
  images: Collection<Image>;
  cars: Collection<Car>;
  galleries: Collection<Gallery>;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const cloudflareId = formData.get("cloudflareId") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const fileName = formData.get("fileName") as string;
    const selectedPromptId = formData.get("selectedPromptId") as string;
    const selectedModelId = formData.get("selectedModelId") as string;
    const carId = formData.get("carId") as string;
    const vehicleInfo = formData.get("vehicleInfo") as string;
    const customMetadata = formData.get("metadata") as string;

    if (!cloudflareId || !imageUrl || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Initialize MongoDB connection
    const db = await getDatabase();
    const collections: Collections = {
      images: db.collection<Image>("images"),
      cars: db.collection<Car>("cars"),
      galleries: db.collection<Gallery>("galleries"),
    };

    const now = new Date().toISOString();
    let analysisResult = null;

    // Perform AI analysis if prompt and model are provided
    if (selectedPromptId && selectedModelId) {
      try {
        console.log(`Starting AI analysis for ${fileName}`);

        analysisResult = await analyzeImage(
          imageUrl,
          vehicleInfo ? JSON.parse(vehicleInfo) : undefined,
          selectedPromptId
        );

        console.log(`AI analysis completed for ${fileName}`);
      } catch (error) {
        console.error(`AI analysis failed for ${fileName}:`, error);
        // Continue without analysis result
      }
    }

    // Prepare metadata
    let metadata = {};
    if (customMetadata) {
      metadata = JSON.parse(customMetadata);
    } else if (analysisResult) {
      metadata = analysisResult;
    }

    // Create image document
    const imageDoc: Omit<Image, "_id"> = {
      cloudflareId,
      url: imageUrl,
      filename: fileName,
      metadata,
      carId: carId ? new ObjectId(carId) : null,
      createdAt: now,
      updatedAt: now,
    };

    // Insert image
    const imageResult = await collections.images.insertOne(imageDoc as Image);
    const imageId = imageResult.insertedId;

    // Update car or gallery if applicable
    if (carId) {
      await collections.cars.updateOne(
        { _id: new ObjectId(carId) },
        {
          $push: { imageIds: imageId },
          $set: { updatedAt: now },
        }
      );
    } else {
      // Add to general gallery
      await collections.galleries.updateOne(
        {},
        {
          $push: { imageIds: imageId },
          $set: { updatedAt: now },
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      imageId: imageId.toString(),
      cloudflareId,
      imageUrl,
      metadata,
    });
  } catch (error) {
    console.error("Analysis endpoint error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
