import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDatabase();

    const cars = await db
      .collection("cars")
      .find({})
      .project({ _id: 1, make: 1, model: 1, year: 1 })
      .sort({ make: 1, model: 1, year: -1 })
      .toArray();

    return NextResponse.json(cars);
  } catch (error) {
    console.error("Error fetching cars list:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars list" },
      { status: 500 }
    );
  }
}
