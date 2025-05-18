import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = process.env.MONGODB_DB_NAME || "motive_archive";

export async function PATCH(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const id = segments[segments.length - 2];

    const client = await getMongoClient();
    try {
      const { primaryImageId } = await request.json();
      const db = client.db(DB_NAME);
      const result = await db
        .collection("cars")
        .updateOne({ _id: new ObjectId(id) }, { $set: { primaryImageId } });
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Car not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error("Error updating car thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to update car thumbnail" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
