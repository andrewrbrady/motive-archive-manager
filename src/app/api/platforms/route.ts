import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Platform {
  _id?: ObjectId;
  name: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Initial platform data for seeding
const INITIAL_PLATFORMS: Omit<Platform, "_id" | "createdAt" | "updatedAt">[] = [
  { name: "Instagram Reels", category: "social", isActive: true },
  { name: "YouTube", category: "video", isActive: true },
  { name: "YouTube Shorts", category: "video", isActive: true },
  { name: "TikTok", category: "social", isActive: true },
  { name: "Facebook", category: "social", isActive: true },
  { name: "Bring a Trailer", category: "marketplace", isActive: true },
  { name: "Other", category: "other", isActive: true },
];

export async function GET() {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const collection = client.db("motive_archive").collection("platforms");

    // Check if platforms exist, if not seed them
    const count = await collection.countDocuments();
    if (count === 0) {
      console.log("No platforms found, seeding initial data...");
      const now = new Date();
      const platformsToInsert = INITIAL_PLATFORMS.map((platform) => ({
        ...platform,
        createdAt: now,
        updatedAt: now,
      }));

      await collection.insertMany(platformsToInsert);
      console.log("Seeded", platformsToInsert.length, "platforms");
    }

    const platforms = await collection
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    const formattedPlatforms = platforms.map((platform) => ({
      _id: platform._id.toString(),
      name: platform.name,
      category: platform.category,
      isActive: platform.isActive,
    }));

    return NextResponse.json(formattedPlatforms);
  } catch (error) {
    console.error("Error fetching platforms:", error);
    return NextResponse.json(
      { error: "Failed to fetch platforms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, category = "other", isActive = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Platform name is required" },
        { status: 400 }
      );
    }

    const collection = client.db("motive_archive").collection("platforms");

    // Check if platform already exists
    const existingPlatform = await collection.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingPlatform) {
      return NextResponse.json(
        { error: "Platform with this name already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const newPlatform: Platform = {
      name,
      category,
      isActive,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newPlatform);

    return NextResponse.json(
      {
        _id: result.insertedId.toString(),
        name: newPlatform.name,
        category: newPlatform.category,
        isActive: newPlatform.isActive,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating platform:", error);
    return NextResponse.json(
      { error: "Failed to create platform" },
      { status: 500 }
    );
  }
}
