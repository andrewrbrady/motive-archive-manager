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

// GET image by ID
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  let client;
  try {
    const { id } = await Promise.resolve(context.params);

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid image ID format" },
        { status: 400 }
      );
    }

    const objectId = new ObjectId(id);

    client = await getMongoClient();
    const db = client.db(DB_NAME);

    console.log(`Fetching image with ID: ${id}`);

    // Find the image in the database
    const image = await db.collection("images").findOne({ _id: objectId });

    if (!image) {
      console.log(`Image not found: ${id}`);
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Process URL to ensure it works with Cloudflare
    if (image.url && !image.url.endsWith("/public")) {
      image.url = `${image.url}/public`;
    }

    console.log(`Found image: ${id}, URL: ${image.url}`);

    // Convert ObjectId to string
    const processedImage = {
      ...image,
      _id: image._id.toString(),
      carId: image.carId ? image.carId.toString() : null,
    };

    return NextResponse.json(processedImage);
  } catch (error) {
    console.error("Error fetching image:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
