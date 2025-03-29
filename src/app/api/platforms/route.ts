import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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

    const platforms = await collection.find({}).toArray();
    const formattedPlatforms = platforms.map((platform) => ({
      _id: platform._id.toString(),
      name: platform.name,
      platformId: platform.platformId,
      color: "text-zinc-600", // Hardcode this for now until we add to DB
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
