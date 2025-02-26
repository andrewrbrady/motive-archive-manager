import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Location, formatLocation } from "@/models/location";

// GET all locations
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const locations = await db.collection("locations").find({}).toArray();

    // Format locations for response
    const formattedLocations = locations.map((location) =>
      formatLocation(location as unknown as Location)
    );

    return NextResponse.json(formattedLocations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new location
export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");
    const data = await request.json();

    // Add timestamps
    const locationData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("locations").insertOne(locationData);
    const insertedId = result.insertedId;

    // Get the inserted document
    const insertedLocation = await db
      .collection("locations")
      .findOne({ _id: insertedId });

    if (!insertedLocation) {
      throw new Error("Failed to retrieve inserted location");
    }

    return NextResponse.json(
      formatLocation(insertedLocation as unknown as Location)
    );
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
