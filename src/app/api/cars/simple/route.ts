import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

/**
 * GET /api/cars/simple
 *
 * A simplified car API that prioritizes consistency over optimization.
 * Always returns cars with their images as a simple array.
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🚗 /api/cars/simple - Starting request");

    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "48"),
      96 // Maximum page size
    );
    const view = searchParams.get("view") || "grid";
    const imageLimit = view === "list" ? 1 : 10; // Only get 1 image for list view, 10 for grid

    console.log("🚗 /api/cars/simple - Query params:", {
      page,
      pageSize,
      view,
    });

    // Get database instance using the utility function
    const db = await getDatabase();
    if (!db) {
      console.error("🚗 /api/cars/simple - Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    console.log("🚗 /api/cars/simple - Database connection successful");

    // Build query with filters
    const query: Record<string, any> = {};

    // Handle make filter
    const make = searchParams.get("make");
    if (make) {
      query.make = make;
    }

    // Handle year range filter
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    if (minYear || maxYear) {
      query.year = {};
      if (minYear && !isNaN(parseInt(minYear))) {
        query.year.$gte = parseInt(minYear);
      }
      if (maxYear && !isNaN(parseInt(maxYear))) {
        query.year.$lte = parseInt(maxYear);
      }

      // If no valid constraints were added, remove the empty year object
      if (Object.keys(query.year).length === 0) {
        delete query.year;
      }
    }

    // Handle client filter
    const clientId = searchParams.get("clientId");
    if (clientId) {
      try {
        query.client = new ObjectId(clientId);
      } catch (error) {
        console.error("Invalid clientId format:", clientId);
        return NextResponse.json(
          { error: "Invalid clientId format" },
          { status: 400 }
        );
      }
    }

    // Handle search query with optimized implementation
    const search = searchParams.get("search");
    if (search && search.trim()) {
      // Create array of terms for multi-term searches
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        // Create $or query for search patterns
        query.$or = [];

        // Define most important fields to search - limit the scope for better performance
        const primaryFields = ["make", "model", "vin"];
        const secondaryFields = ["color", "status", "location"];

        searchTerms.forEach((term) => {
          // Escape special regex characters to prevent errors
          const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

          // Create more efficient regex pattern
          const searchRegex = new RegExp(escapedTerm, "i");

          // Prioritize exact matches for performance
          if (/^\d+$/.test(term)) {
            // If the term is a number, prioritize year exact match
            const numericValue = parseInt(term);
            if (!isNaN(numericValue)) {
              query.$or.push({ year: numericValue });
            }
          }

          // Apply search to primary fields first
          primaryFields.forEach((field) => {
            query.$or.push({ [field]: searchRegex });
          });

          // Only search secondary fields for longer terms
          if (term.length >= 3) {
            secondaryFields.forEach((field) => {
              query.$or.push({ [field]: searchRegex });
            });
          }
        });

        // For multi-word searches, also try to match the full search term
        if (searchTerms.length > 1) {
          const fullSearchRegex = new RegExp(
            search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            "i"
          );
          primaryFields.forEach((field) => {
            query.$or.push({ [field]: fullSearchRegex });
          });
        }
      }
    }

    // [REMOVED] // [REMOVED] console.log("Query filters:", JSON.stringify(query, null, 2));

    try {
      // Count total cars for pagination
      const totalCount = await db.collection("cars").countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);

      // Handle sort parameter
      let sortField = "createdAt";
      let sortDirection = -1;

      const sort = searchParams.get("sort");
      if (sort) {
        const [field, direction] = sort.split("_");
        sortField = field || "createdAt";
        sortDirection = direction === "asc" ? 1 : -1;

        // Use _id for sorting when "createdAt_desc" is selected
        // since MongoDB's ObjectId contains a creation timestamp
        if (sort === "createdAt_desc") {
          sortField = "_id";
          sortDirection = -1;
        }
      } else {
        // If no sort specified, default to sorting by _id in descending order
        // for "recently added" items using MongoDB's ObjectId timestamp
        sortField = "_id";
        sortDirection = -1;
      }

      // Simple consistent pipeline
      const pipeline = [
        { $match: query },
        { $sort: { [sortField]: sortDirection } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
        // Look up images from imageIds
        {
          $lookup: {
            from: "images",
            let: { imageIds: { $ifNull: ["$imageIds", []] } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [{ $toString: "$_id" }, "$$imageIds"],
                  },
                },
              },
              { $limit: imageLimit }, // Only get first 10 images for performance
            ],
            as: "images",
          },
        },
      ];

      // Execute query
      const cars = await db.collection("cars").aggregate(pipeline).toArray();

      // Process data for client with better error handling
      const processedCars = cars.map((car, index) => {
        try {
          return {
            ...car,
            _id: car._id?.toString() || `unknown-${index}`,
            images: (car.images || []).map((img: any) => ({
              ...img,
              _id: img._id?.toString() || "unknown-image",
              url:
                img.url && img.url.endsWith("/public")
                  ? img.url
                  : `${img.url || ""}/public`,
            })),
            client: car.client?.toString() || null,
            eventIds: (car.eventIds || [])
              .filter((id: any) => id != null)
              .map((id: ObjectId) => id.toString()),
            deliverableIds: (car.deliverableIds || [])
              .filter((id: any) => id != null)
              .map((id: ObjectId) => id.toString()),
            documentationIds: (car.documentationIds || [])
              .filter((id: any) => id != null)
              .map((id: ObjectId) => id.toString()),
          };
        } catch (processingError) {
          console.error(
            `Error processing car at index ${index}:`,
            processingError
          );
          console.error("Car data:", JSON.stringify(car, null, 2));
          throw processingError;
        }
      });

      // Log what we're sending back
      // [REMOVED] // [REMOVED] console.log(`Returning ${processedCars.length} cars with images`);

      const response = NextResponse.json({
        cars: processedCars,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          pageSize,
        },
      });

      // Add cache headers for better performance
      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300"
      );
      response.headers.set("ETag", `"cars-${totalCount}-${page}-${pageSize}"`);

      return response;
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      console.error(
        "Error stack:",
        dbError instanceof Error ? dbError.stack : "No stack trace"
      );
      return NextResponse.json(
        {
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in simple cars API:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
