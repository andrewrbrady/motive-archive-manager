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

    const db = await getDatabase();
    if (!db) {
      console.error("Failed to get database instance");
      return NextResponse.json(
        { error: "Failed to connect to database" },
        { status: 500 }
      );
    }

    // Build advanced query with filters (consolidated from simple endpoint)
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

    // Enhanced search implementation (consolidated from simple endpoint)
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

    try {
      // Count total cars for pagination
      const totalCount = await db.collection("cars").countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);

      // Enhanced sort handling (consolidated from simple endpoint)
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

      // Legacy field selection vs modern aggregation pipeline
      if (fieldsParam && !searchParams.get("includeImages")) {
        // Legacy simple query with field projection (backward compatibility)
        const sortOptions: Record<string, 1 | -1> = {
          [sortField]: sortDirection as 1 | -1,
        };
        const cars = await db
          .collection("cars")
          .find(query)
          .project(projection)
          .sort(sortOptions)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray();

        return NextResponse.json({
          cars,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            pageSize,
          },
        });
      } else {
        // Modern aggregation pipeline with image handling (consolidated from simple endpoint)
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

        // Process data for client with better error handling (consolidated from simple endpoint)
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

        const response = NextResponse.json({
          cars: processedCars,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            pageSize,
          },
        });

        // Add cache headers for better performance (consolidated from simple endpoint)
        response.headers.set(
          "Cache-Control",
          "public, s-maxage=60, stale-while-revalidate=300"
        );
        response.headers.set(
          "ETag",
          `"cars-${totalCount}-${page}-${pageSize}"`
        );

        return response;
      }
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
    console.error("Error fetching cars:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch cars", details: errorMessage },
      { status: 500 }
    );
  }
}
