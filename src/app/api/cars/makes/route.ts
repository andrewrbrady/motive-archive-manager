import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

// Cache car makes for 1 hour since they don't change frequently
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    console.log("🚗 /api/cars/makes - Starting request");
    console.log("🚗 /api/cars/makes - Request headers:", {
      authorization: request.headers.get("authorization") || "MISSING",
      "user-agent": request.headers.get("user-agent"),
      origin: request.headers.get("origin"),
    });

    // Verify authentication with detailed logging
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      console.log(
        "🚗 /api/cars/makes - Authentication failed, returning error response"
      );
      return authResult;
    }

    console.log("🚗 /api/cars/makes - Authentication successful");

    const db = await getDatabase();
    console.log("🚗 /api/cars/makes - Database connection successful");

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

    console.log(
      "🚗 /api/cars/makes - Successfully fetched makes:",
      makes.length
    );

    const response = NextResponse.json({ makes });

    // Add cache headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );
    response.headers.set("ETag", `"makes-${makes.length}"`);

    return response;
  } catch (error) {
    console.error("🚗 /api/cars/makes - Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      { status: 500 }
    );
  }
}
