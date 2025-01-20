import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

// app/api/cars/route.ts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    interface QueryFilter {
      make?: { $regex: string; $options: string };
      year?: { $gte: string; $ne: string };
      // Add other filter types as needed
    }

    const query: QueryFilter = {};

    // Build query based on search parameters
    const make = searchParams.get("make");
    if (make) {
      query.make = {
        $regex: make,
        $options: "i",
      };
    }

    const pipeline = [
      {
        $match: {
          $and: [
            // Handle empty/null/NaN values appropriately
            searchParams.get("make")
              ? {
                  make: {
                    $regex: searchParams.get("make"),
                    $options: "i",
                  },
                }
              : {},
            searchParams.get("minYear")
              ? {
                  year: {
                    $gte: searchParams.get("minYear"),
                    $ne: "",
                  },
                }
              : {},
            // Add more filter conditions
          ],
        },
      },
      {
        // Join with clients collection
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "dealerInfo",
        },
      },
      {
        $unwind: {
          path: "$dealerInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    // Execute pipeline and return results
  } catch (error) {
    console.error("Error in GET /api/cars:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
    });
  }
}
