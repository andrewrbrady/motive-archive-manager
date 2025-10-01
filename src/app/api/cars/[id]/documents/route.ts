import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME =
  process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "motive";

// GET documents for a car
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const car = await db.collection("cars").findOne({
      _id: new ObjectId(id),
    });

    if (!car) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ documents: car.documents || [] });
  } catch (error) {
    console.error("Error fetching car documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch car documents" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    const { documents } = await request.json();
    const client = await getMongoClient();
    const db = client.db(DB_NAME);
    const now = new Date();

    const result = await db.collection("cars").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          documents,
          updatedAt: now,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Car not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating car documents:", error);
    return NextResponse.json(
      { error: "Failed to update car documents" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
