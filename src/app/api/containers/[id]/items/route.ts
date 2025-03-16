import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET all items in a specific container
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("motive_archive");

    // Fetch all items with the matching container_id
    const items = await db
      .collection("studio_inventory")
      .find({ container_id: params.id })
      .toArray();

    // If no items are found, return an empty array
    if (!items || items.length === 0) {
      return NextResponse.json([]);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items in container:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
