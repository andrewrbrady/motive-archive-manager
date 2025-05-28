import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

// Cache car makes for 1 hour since they don't change frequently
export const revalidate = 3600;

export async function GET() {
  try {
    const db = await getDatabase();

    // Use aggregation pipeline instead of distinct (API Version 1 compatible)
    const pipeline = [
      {
        $match: {
          make: {
            $exists: true,
            $ne: null,
            $not: { $eq: "" },
          },
        },
      },
      {
        $group: {
          _id: "$make",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    const result = await db.collection("cars").aggregate(pipeline).toArray();
    const makes = result.map((doc) => doc._id).filter(Boolean);

    const response = NextResponse.json({ makes });

    // Add cache headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );
    response.headers.set("ETag", `"makes-${makes.length}"`);

    return response;
  } catch (error) {
    console.error("Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      { status: 500 }
    );
  }
}
