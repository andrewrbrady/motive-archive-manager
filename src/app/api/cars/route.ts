// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Car as InventoryCar } from "@/types/inventory";
import { getMongoClient } from "@/lib/mongodb";
import { DB_NAME } from "@/constants";
import { MongoPipelineStage } from "@/types/mongodb";
import { StandardizedCar } from "@/types/routes/cars";
import { verifyAuthMiddleware } from "@/lib/firebase-auth-middleware";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const db = await getDatabase();
    const data = await request.json();

    if (process.env.NODE_ENV !== "production") {
      console.log("Creating car with data:", {
        make: data.make,
        model: data.model,
        year: data.year,
        hasVin: !!data.vin,
        hasClientData: !!data.clientId,
        fieldsCount: Object.keys(data).length,
      });
    }

    // Ensure dimensions are properly structured
    if (data.dimensions) {
      // Ensure GVWR has proper structure
      if (data.dimensions.gvwr && typeof data.dimensions.gvwr === "object") {
        data.dimensions.gvwr = {
          value: data.dimensions.gvwr.value || null,
          unit: data.dimensions.gvwr.unit || "lbs",
        };
      }

      // Ensure weight has proper structure
      if (
        data.dimensions.weight &&
        typeof data.dimensions.weight === "object"
      ) {
        data.dimensions.weight = {
          value: data.dimensions.weight.value || null,
          unit: data.dimensions.weight.unit || "lbs",
        };
      }
    }

    // Create a new car document
    const result = await db.collection("cars").insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const car = await db.collection("cars").findOne({ _id: result.insertedId });

    if (process.env.NODE_ENV !== "production") {
      console.log("Created car:", {
        id: car?._id,
        make: car?.make,
        model: car?.model,
        year: car?.year,
        hasVin: !!car?.vin,
      });
    }
    return NextResponse.json(car, { status: 201 });
  } catch (error) {
    console.error(
      "Error creating car:",
      (error as Error).message || "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to create car" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthMiddleware(request);
    if (authResult) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);

    // Enhanced pagination support (consolidated from simple endpoint)
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(
        searchParams.get("pageSize") || searchParams.get("limit") || "48"
      ),
      96 // Maximum page size for performance
    );
    const view = searchParams.get("view") || "grid";
    const imageLimit = view === "list" ? 1 : 10; // Optimize image loading based on view

    // Legacy support for 'fields' parameter (basic field selection)
    const fieldsParam = searchParams.get("fields");
    const projection: Record<string, 1> = {};
    if (fieldsParam) {
      const fields = fieldsParam.split(",");
      fields.forEach((field) => {
        projection[field] = 1;
      });
    }

    // ⚡ OPTIMIZED: Single database connection with better error handling
    let db;
    try {
      db = await getDatabase();
      if (!db) {
        console.error("Failed to get database instance");
        return NextResponse.json(
          { error: "Failed to connect to database" },
          { status: 500 }
        );
      }
    } catch (dbConnError) {
      console.error("Database connection error:", dbConnError);
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: "Connection timeout or pool exhaustion",
        },
        { status: 503 }
      );
    }

    // Build advanced query with filters (consolidated from simple endpoint)
    const query: Record<string, any> = {};

    // Handle batch ID fetching for optimization (CarDetailsContext support)
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").filter(Boolean);
      const validObjectIds: ObjectId[] = [];

      for (const id of ids) {
        if (ObjectId.isValid(id)) {
          validObjectIds.push(new ObjectId(id));
        }
      }

      if (validObjectIds.length > 0) {
        query._id = { $in: validObjectIds };
        // ⚡ OPTIMIZED: Simplified query for batch ID requests to reduce connection usage
        try {
          const cars = await db
            .collection("cars")
            .find(query)
            .project(
              Object.keys(projection).length > 0
                ? projection
                : { _id: 1, make: 1, model: 1, year: 1, color: 1, vin: 1 }
            )
            .toArray();

          return NextResponse.json(cars);
        } catch (queryError) {
          console.error("Batch query error:", queryError);
          return NextResponse.json(
            { error: "Query execution failed" },
            { status: 500 }
          );
        }
      } else {
        // No valid IDs provided
        return NextResponse.json([]);
      }
    }

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

    // Enhanced search implementation (consolidated from simple endpoint)
    const search = searchParams.get("search");
    if (search && search.trim()) {
      // Create array of terms for multi-term searches
      const searchTerms = search.trim().split(/\s+/).filter(Boolean);

      if (searchTerms.length > 0) {
        // Create $or query for search patterns
        query.$or = [];

        // ⚡ OPTIMIZED: Reduced search fields for better performance
        const primaryFields = ["make", "model", "vin"];
        const secondaryFields = ["color"];

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

    try {
      // ⚡ OPTIMIZED: Use Promise.allSettled to prevent one query failure from affecting the other
      const [totalCountResult, carsResult] = await Promise.allSettled([
        db.collection("cars").countDocuments(query),
        (() => {
          // Enhanced sort handling (consolidated from simple endpoint)
          let sortField = "createdAt";
          let sortDirection = -1;

          const sort = searchParams.get("sort");
          if (sort) {
            const [field, direction] = sort.split("_");
            sortField = field || "createdAt";
            sortDirection = direction === "asc" ? 1 : -1;

            // Use _id for sorting when "createdAt_desc" is selected
            if (sort === "createdAt_desc") {
              sortField = "_id";
              sortDirection = -1;
            }
          } else {
            // Default to sorting by _id in descending order
            sortField = "_id";
            sortDirection = -1;
          }

          // Legacy field selection vs modern aggregation pipeline
          if (fieldsParam && !searchParams.get("includeImages")) {
            // Legacy simple query with field projection (backward compatibility)
            const sortOptions: Record<string, 1 | -1> = {
              [sortField]: sortDirection as 1 | -1,
            };
            return db
              .collection("cars")
              .find(query)
              .project(projection)
              .sort(sortOptions)
              .skip((page - 1) * pageSize)
              .limit(pageSize)
              .toArray();
          } else {
            // ⚡ OPTIMIZED: Simplified aggregation pipeline to reduce connection strain
            const pipeline: any[] = [
              { $match: query },
              { $sort: { [sortField]: sortDirection } },
              { $skip: (page - 1) * pageSize },
              { $limit: pageSize },
            ];

            // Only add image lookup if specifically requested to reduce complexity
            if (searchParams.get("includeImages") === "true") {
              pipeline.push({
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
                    { $limit: imageLimit },
                  ],
                  as: "images",
                },
              });
            }

            return db.collection("cars").aggregate(pipeline).toArray();
          }
        })(),
      ]);

      // Handle results with proper error checking
      let totalCount = 0;
      let cars: any[] = [];

      if (totalCountResult.status === "fulfilled") {
        totalCount = totalCountResult.value;
      } else {
        console.error("Count query failed:", totalCountResult.reason);
        // Fallback: continue without count for pagination
        totalCount = 0;
      }

      if (carsResult.status === "fulfilled") {
        cars = carsResult.value;
      } else {
        console.error("Cars query failed:", carsResult.reason);
        return NextResponse.json(
          {
            error: "Query execution failed",
            details: "Database query timeout",
          },
          { status: 500 }
        );
      }

      const totalPages = Math.ceil(totalCount / pageSize);

      // ⚡ OPTIMIZED: Simplified data processing with better error handling
      const processedCars = cars.map((car, index) => {
        try {
          const processedCar = {
            ...car,
            _id: car._id?.toString() || `unknown-${index}`,
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

          // Only process images if they exist
          if (car.images && Array.isArray(car.images)) {
            processedCar.images = car.images.map((img: any) => ({
              ...img,
              _id: img._id?.toString() || "unknown-image",
              url:
                img.url && img.url.endsWith("/public")
                  ? img.url
                  : `${img.url || ""}/public`,
            }));
          }

          return processedCar;
        } catch (processingError) {
          console.error(
            `Error processing car at index ${index}:`,
            processingError
          );
          // Return minimal car data on processing error
          return {
            _id: car._id?.toString() || `error-${index}`,
            make: car.make || "Unknown",
            model: car.model || "Unknown",
            year: car.year || 0,
            error: "Processing error",
          };
        }
      });

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

      // ⚡ OPTIMIZED: Better error classification for connection issues
      const errorMessage =
        dbError instanceof Error ? dbError.message : "Unknown error";
      const isConnectionError =
        errorMessage.toLowerCase().includes("connection") ||
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("pool");

      return NextResponse.json(
        {
          error: isConnectionError
            ? "Database connection timeout"
            : "Database operation failed",
          details: errorMessage,
          retryAfter: isConnectionError ? 5 : null, // Suggest retry for connection errors
        },
        { status: isConnectionError ? 503 : 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching cars:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch cars", details: errorMessage },
      { status: 500 }
    );
  }
}
