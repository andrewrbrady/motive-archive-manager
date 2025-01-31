import { NextRequest, NextResponse } from "next/server";
import { ObjectId, Collection } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

// Set maximum execution time to 60 seconds
export const maxDuration = 60;
export const runtime = "nodejs";

// Ensure environment variables are set
if (
  !process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
  !process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
) {
  throw new Error("Cloudflare credentials not set in environment variables");
}

interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
}

interface CloudflareResponse {
  result: {
    images: CloudflareImage[];
  };
  success: boolean;
  errors: Array<{
    code: number;
    message: string;
  }>;
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

export async function GET() {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const result = (await response.json()) as CloudflareResponse;

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      );
    }

    // Transform the response to return only the image URLs without the /public suffix
    const images = result.result.images.map((image) =>
      image.variants[0].replace(/\/public$/, "")
    );

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error fetching images from Cloudflare:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let dbConnection;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const metadata = formData.get("metadata") as string;
    const vehicleInfo = formData.get("vehicleInfo") as string;
    const carId = formData.get("carId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!carId) {
      return NextResponse.json(
        { error: "No car ID provided" },
        { status: 400 }
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("requireSignedURLs", "false");

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
        body: uploadFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      return NextResponse.json(
        { error: `Failed to upload to Cloudflare: ${response.statusText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Cloudflare API error:", result.errors);
      return NextResponse.json(
        { error: result.errors?.[0]?.message || "Unknown Cloudflare error" },
        { status: 400 }
      );
    }

    const imageUrl = result.result.variants[0].replace(/\/public$/, "");

    // Analyze the image with OpenAI
    const analysisResponse = await fetch(
      `${request.nextUrl.origin}/api/openai/analyze-image`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          vehicleInfo: vehicleInfo ? JSON.parse(vehicleInfo) : undefined,
        }),
      }
    );

    let combinedMetadata = {};

    if (analysisResponse.ok) {
      const analysisResult = await analysisResponse.json();
      // Combine the original metadata with the AI analysis
      combinedMetadata = {
        ...JSON.parse(metadata || "{}"),
        angle: analysisResult.analysis?.angle || "",
        view: analysisResult.analysis?.view || "",
        movement: analysisResult.analysis?.movement || "",
        tod: analysisResult.analysis?.tod || "",
        side: analysisResult.analysis?.side || "",
        description: analysisResult.analysis?.description || "",
        aiAnalysis: analysisResult.analysis,
      };
    } else {
      const errorText = await analysisResponse.text();
      console.error("OpenAI analysis error:", {
        status: analysisResponse.status,
        statusText: analysisResponse.statusText,
        body: errorText,
      });
      combinedMetadata = JSON.parse(metadata || "{}");
    }

    // Store the image metadata in MongoDB
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const imagesCollection: Collection<Image> = db.collection("images");
    const carsCollection: Collection<Car> = db.collection("cars");

    const imageDoc = {
      _id: new ObjectId(),
      cloudflareId: result.result.id,
      url: imageUrl,
      filename: file.name,
      metadata: combinedMetadata,
      carId: new ObjectId(carId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Insert the image document
    await imagesCollection.insertOne(imageDoc);

    // Update the car document with the new image ID
    await carsCollection.updateOne(
      { _id: new ObjectId(carId) },
      {
        $push: { imageIds: imageDoc._id },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    // Return both the image ID, URL, and the metadata
    return NextResponse.json({
      success: true,
      imageId: result.result.id,
      imageUrl,
      metadata: combinedMetadata,
    });
  } catch (error) {
    console.error("Error uploading to Cloudflare Images:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  let dbConnection;
  try {
    const { imageId, carId } = await request.json();

    if (!imageId || !carId) {
      return NextResponse.json(
        { error: "No image ID or car ID provided" },
        { status: 400 }
      );
    }

    // Delete from Cloudflare
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}/images/v1/${imageId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CLOUDFLARE_API_TOKEN}`,
        },
      }
    );

    const result = await response.json();

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collections
    const imagesCollection: Collection<Image> = db.collection("images");
    const carsCollection: Collection<Car> = db.collection("cars");

    // Find and delete the image document
    const image = await imagesCollection.findOne({ cloudflareId: imageId });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    await imagesCollection.deleteOne({ _id: image._id });

    // Remove the image ID from the car document
    await carsCollection.updateOne(
      { _id: new ObjectId(carId) },
      {
        $pull: { imageIds: image._id },
        $set: { updatedAt: new Date().toISOString() },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
