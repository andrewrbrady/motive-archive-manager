import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Use aggregation pipeline instead of distinct (API Version 1 compatible)
    const pipeline = [
      {
        $match: {
          manufacturer: {
            $exists: true,
            $ne: null,
            $not: { $eq: "" },
          },
        },
      },
      {
        $group: {
          _id: "$manufacturer",
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ];

    const result = await db
      .collection("studio_inventory")
      .aggregate(pipeline)
      .toArray();
    const manufacturers = result.map((doc) => doc._id).filter(Boolean);

    return NextResponse.json(manufacturers);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json(
      { error: "Failed to fetch manufacturers" },
      { status: 500 }
    );
  }
}
