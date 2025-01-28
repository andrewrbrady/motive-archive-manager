import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET /api/bat-listings?carId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const carId = searchParams.get("carId");

    if (!carId) {
      return NextResponse.json(
        { error: "Car ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("motive_archive");
    const listings = await db
      .collection("bat_listings")
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

    const client = await clientPromise;
    const db = client.db("motive_archive");
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

    const result = await db.collection("bat_listings").insertOne(listing);

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
