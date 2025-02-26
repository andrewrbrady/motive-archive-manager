import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Get all unique manufacturers from the inventory collection
    const manufacturers = await db
      .collection("studio_inventory")
      .distinct("manufacturer");

    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json(
      { error: "Failed to fetch manufacturers" },
      { status: 500 }
    );
  }
}
