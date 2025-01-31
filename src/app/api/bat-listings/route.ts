import { NextRequest, NextResponse } from "next/server";
import { Collection, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/mongodb";

interface BATListing {
  _id?: ObjectId;
  carId: ObjectId;
  content: string;
  focus?: string;
  style?: string;
  tone?: string;
  length?: string;
  additionalContext?: string;
  car?: any;
  createdAt: string;
  updatedAt: string;
}

// GET /api/bat-listings?carId=xxx
export async function GET(request: NextRequest) {
  let dbConnection;
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const listingsCollection: Collection<BATListing> =
      db.collection("bat_listings");

    const listings = await listingsCollection
      .find({ carId: new ObjectId(carId) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Error fetching BaT listings:", error);
    return NextResponse.json(
      { error: "Failed to fetch listings" },
      { status: 500 }
    );
  }
}

// POST /api/bat-listings
export async function POST(request: NextRequest) {
  let dbConnection;
  try {
    const body = await request.json();
    const {
      carId,
      content,
      focus,
      style,
      tone,
      length,
      additionalContext,
      car,
    } = body;

    if (!carId || !content) {
      return NextResponse.json(
        { error: "Car ID and content are required" },
        { status: 400 }
      );
    }

    // Get database connection from our connection pool
    dbConnection = await connectToDatabase();
    const db = dbConnection.db;

    // Get typed collection
    const listingsCollection: Collection<BATListing> =
      db.collection("bat_listings");

    const now = new Date().toISOString();

    const listing = {
      carId: new ObjectId(carId),
      content,
      focus,
      style,
      tone,
      length,
      additionalContext,
      car,
      createdAt: now,
      updatedAt: now,
    };

    const result = await listingsCollection.insertOne(listing);

    return NextResponse.json({
      ...listing,
      _id: result.insertedId,
    });
  } catch (error) {
    console.error("Error creating BaT listing:", error);
    return NextResponse.json(
      { error: "Failed to create listing" },
      { status: 500 }
    );
  }
}
