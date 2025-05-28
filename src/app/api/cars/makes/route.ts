import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDatabase();

    // Get distinct makes from the cars collection
    const makes = await db.collection("cars").distinct("make", {
      make: {
        $exists: true,
        $ne: null,
        $not: { $eq: "" },
      },
    });

    // Sort makes alphabetically
    const sortedMakes = makes.sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ makes: sortedMakes });
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      { status: 500 }
    );
  }
}
