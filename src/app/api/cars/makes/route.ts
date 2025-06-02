import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

// Cache car makes for 1 hour since they don't change frequently
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    console.log("🚗 /api/cars/makes - Starting optimized request");
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

    // Parse query parameters for enhanced functionality
    const { searchParams } = new URL(request.url);
    const includeCounts = searchParams.get("counts") === "true";

    // ✅ CORRECTED: Source from curated makes database, not car inventory
    console.log("🚗 /api/cars/makes - Fetching from curated makes database");

    // Get all active makes from the makes collection (curated database)
    const makes = await db
      .collection("makes")
      .find({ active: true })
      .sort({ name: 1 })
      .toArray();

    console.log(
      "🚗 /api/cars/makes - Successfully fetched makes from database:",
      makes.length
    );

    // ✅ BACKWARD COMPATIBILITY: Default to simple string array for existing consumers
    if (!includeCounts) {
      // Return simple string array format (existing behavior)
      const makeNames = makes.map((make) => make.name).filter(Boolean);

      const response = NextResponse.json({ makes: makeNames });

      // Add optimized cache headers
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=3600, stale-while-revalidate=7200"
      );
      response.headers.set("ETag", `"makes-simple-${makeNames.length}"`);

      return response;
    }

    // ✅ ENHANCED FUNCTIONALITY: Include car counts when requested
    console.log("🚗 /api/cars/makes - Enhanced mode with car counts");

    // If counts are requested, get car counts for each make
    const makesWithCounts = await Promise.all(
      makes.map(async (make) => {
        const carCount = await db
          .collection("cars")
          .countDocuments({ make: make.name });

        return {
          name: make.name,
          carCount,
        };
      })
    );

    const totalCars = makesWithCounts.reduce(
      (sum, make) => sum + make.carCount,
      0
    );

    // Build enhanced response
    const enhancedResponse = {
      makes: makesWithCounts,
      totalCars,
      lastUpdated: new Date().toISOString(),
    };

    console.log(
      "🚗 /api/cars/makes - Successfully fetched enhanced makes with counts:",
      makesWithCounts.length
    );

    const response = NextResponse.json(enhancedResponse);

    // Add cache headers with feature-specific ETag
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );
    response.headers.set(
      "ETag",
      `"makes-enhanced-counts-${makesWithCounts.length}"`
    );

    return response;
  } catch (error) {
    console.error("🚗 /api/cars/makes - Error fetching makes:", error);
    return NextResponse.json(
      { error: "Failed to fetch makes" },
      { status: 500 }
    );
  }
}
