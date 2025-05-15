import { MongoClient, ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = process.env.MONGODB_DB_NAME || "motive";

// GET documents for a car
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const client = await getMongoClient();
  try {
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
  } finally {
    await client.close();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const client = await getMongoClient();
  try {
    const { documents } = await request.json();
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
  } finally {
    await client.close();
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
