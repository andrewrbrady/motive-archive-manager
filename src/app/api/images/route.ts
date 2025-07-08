import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { fixCloudflareImageUrl } from "@/lib/image-utils";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

// Images can be cached for short periods

export async function GET(request: NextRequest) {
  try {
    // Verify authentication following cars/deliverables pattern
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    // Enhanced pagination support with pageSize parameter (max 100 for images)
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "20"
      ),
      100 // Maximum page size for performance
    );
    const search = searchParams.get("search");
    const angle = searchParams.get("angle");
    const movement = searchParams.get("movement");
    const tod = searchParams.get("tod");
    const view = searchParams.get("view");
    const carId = searchParams.get("carId");

    console.log("[API] Images request:", {
      page,
      pageSize,
      search,
      filters: { angle, movement, tod, view, carId },
    });

    const skip = (page - 1) * pageSize;

    // Build query
    const query: any = {};

    // Collect filter conditions to combine with AND
    const filterConditions = [];

    // Add metadata filters with support for nested metadata and case-insensitive matching
    if (angle) {
      filterConditions.push({
        $or: [
          { "metadata.angle": { $regex: new RegExp(`^${angle}$`, "i") } },
          {
            "metadata.originalImage.metadata.angle": {
              $regex: new RegExp(`^${angle}$`, "i"),
            },
          },
        ],
      });
    }

    if (movement) {
      filterConditions.push({
        $or: [
          { "metadata.movement": { $regex: new RegExp(`^${movement}$`, "i") } },
          {
            "metadata.originalImage.metadata.movement": {
              $regex: new RegExp(`^${movement}$`, "i"),
            },
          },
        ],
      });
    }

    if (tod) {
      filterConditions.push({
        $or: [
          { "metadata.tod": { $regex: new RegExp(`^${tod}$`, "i") } },
          {
            "metadata.originalImage.metadata.tod": {
              $regex: new RegExp(`^${tod}$`, "i"),
            },
          },
        ],
      });
    }

    if (view) {
      filterConditions.push({
        $or: [
          { "metadata.view": { $regex: new RegExp(`^${view}$`, "i") } },
          {
            "metadata.originalImage.metadata.view": {
              $regex: new RegExp(`^${view}$`, "i"),
            },
          },
        ],
      });
    }

    if (carId && carId !== "all") {
      try {
        query.carId = new ObjectId(carId);
      } catch (err) {
        console.error("[API] Invalid carId format:", carId);
        return NextResponse.json(
          { error: "Invalid carId format" },
          { status: 400 }
        );
      }
    }

    // Combine filter conditions with AND
    if (filterConditions.length > 0) {
      query.$and = (query.$and || []).concat(filterConditions);
    }

    // Enhanced search implementation following cars/deliverables pattern
    if (search && search.trim()) {
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        const searchConditions: any[] = [];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const searchRegex = new RegExp(escapedTerm, "i");

          // Apply search to primary fields
          searchConditions.push(
            { filename: searchRegex },
            { "metadata.description": searchRegex }
          );
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          searchConditions.push(
            { filename: fullSearchRegex },
            { "metadata.description": fullSearchRegex }
          );
        }

        // Add search as an additional AND condition
        query.$and = (query.$and || []).concat([{ $or: searchConditions }]);
      }
    }

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    try {
      const imagesCollection = db.collection("images");

      // Get total count for pagination
      const total = await imagesCollection.countDocuments(query);

      // Get paginated images
      const images = await imagesCollection
        .find(query)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray();

      // Process images
      const processedImages = images.map((img) => {
        return {
          ...img,
          _id: img._id.toString(),
          carId: img.carId ? img.carId.toString() : "",
          url: fixCloudflareImageUrl(img.url),
        };
      });

      const response = NextResponse.json({
        images: processedImages,
        pagination: {
          total,
          page,
          limit: pageSize, // Maintain backward compatibility with 'limit' field
          pageSize,
          pages: Math.ceil(total / pageSize),
        },
      });

      console.log("[API] Sending response:", {
        totalImages: total,
        currentPage: page,
        imagesInResponse: processedImages.length,
      });

      // Add cache headers for better performance following cars/deliverables pattern
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set("ETag", `"images-${total}-${page}-${pageSize}"`);

      return response;
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[API] Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}
