import { NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

interface Platform {
  _id: ObjectId;
  name: string;
  platformId: string;
  color?: string;
}

export async function GET() {
  let dbConnection;
  try {
    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const platformsCollection: Collection<Platform> =
      db.collection("platforms");

    const platforms = await platformsCollection.find({}).toArray();
    const formattedPlatforms = platforms.map((platform) => ({
      _id: platform._id.toString(),
      name: platform.name,
      platformId: platform.platformId,
      color: "text-gray-600", // Hardcode this for now until we add to DB
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
