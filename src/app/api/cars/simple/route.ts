import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";

/**
 * GET /api/cars/simple
 *
 * A simplified car API that prioritizes consistency over optimization.
 * Always returns cars with their images as a simple array.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "48"),
      96 // Maximum page size
    );

    console.log("Simple cars API request:", { page, pageSize });

    // Connect to MongoDB
    const client = await clientPromise;
    if (!client) {
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }
    const db = client.db(process.env.MONGODB_DB || "motive_archive");

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
      query.client = new ObjectId(clientId);
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

          // Create more efficient regex pattern - this is more precise and less expensive
          // Allow for small typos at word boundaries but not permissive fuzzy matching
          const searchRegex = new RegExp(escapedTerm, "i");

          // Prioritize exact matches for performance
          if (/^\d+$/.test(term)) {
            // If the term is a number, prioritize year exact match
            const numericValue = parseInt(term);
            if (!isNaN(numericValue)) {
              query.$or.push({ year: numericValue });
            }
          }

          // Apply search to primary fields first (these are most important)
          primaryFields.forEach((field) => {
            query.$or.push({ [field]: searchRegex });
          });

          // Only search secondary fields for longer terms (3+ chars) to reduce false positives
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

    console.log("Query filters:", JSON.stringify(query, null, 2));

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
            { $limit: 10 }, // Only get first 10 images for performance
          ],
          as: "images",
        },
      },
    ];

    // Execute query
    const cars = await db.collection("cars").aggregate(pipeline).toArray();

    // Process data for client
    const processedCars = cars.map((car) => ({
      ...car,
      _id: car._id.toString(),
      images: (car.images || []).map((img: any) => ({
        ...img,
        _id: img._id.toString(),
        url: img.url.endsWith("/public") ? img.url : `${img.url}/public`,
      })),
      client: car.client?.toString(),
      eventIds: (car.eventIds || []).map((id: ObjectId) => id.toString()),
      deliverableIds: (car.deliverableIds || []).map((id: ObjectId) =>
        id.toString()
      ),
      documentationIds: (car.documentationIds || []).map((id: ObjectId) =>
        id.toString()
      ),
    }));

    // Log what we're sending back
    console.log(`Returning ${processedCars.length} cars with images`);

    return NextResponse.json({
      cars: processedCars,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        pageSize,
      },
    });
  } catch (error) {
    console.error("Error in simple cars API:", error);
    return NextResponse.json(
      { error: "Failed to fetch cars" },
      { status: 500 }
    );
  }
}
