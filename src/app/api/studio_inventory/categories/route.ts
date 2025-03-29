import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// GET categories from studio inventory
export async function GET() {
  try {
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db("motive_archive");

    // Get distinct categories from the studio_inventory collection
    const categories = await db
      .collection("studio_inventory")
      .distinct("category");

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
