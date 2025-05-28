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

    // Use aggregation pipeline instead of distinct (API Version 1 compatible)
    const pipeline = [
      {
        $match: {
          category: {
            $exists: true,
            $ne: null,
            $not: { $eq: "" },
          },
        },
      },
      {
        $group: {
          _id: "$category",
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
    const categories = result.map((doc) => doc._id).filter(Boolean);

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
