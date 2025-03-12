// app/api/cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Car } from "@/models/Car";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { Car as InventoryCar } from "@/types/inventory";

// Enhanced API logging utility
function apiLog(
  message: string,
  data: any = {},
  level: "info" | "warn" | "error" = "info"
) {
  const prefix = `[API] 🚙 Cars API: ${message}`;

  if (level === "error") {
    console.error(prefix, JSON.stringify(data, null, 2));
  } else if (level === "warn") {
    console.warn(prefix, JSON.stringify(data, null, 2));
  } else {
    console.log(prefix, JSON.stringify(data, null, 2));
  }
}

// Add error handling utility
function errorHandler(error: unknown, message: string): NextResponse {
  apiLog(
    message,
    {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    "error"
  );

  // Determine if this is a connection error
  const errorStr = String(error);
  if (
    errorStr.includes("connection") ||
    errorStr.includes("timeout") ||
    errorStr.includes("network")
  ) {
    return NextResponse.json(
      { error: "Database connection error. Please try again." },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: message }, { status: 500 });
}

interface StandardizedCar {
  _id: string;
  price: {
    listPrice: number | null;
    soldPrice?: number | null;
    priceHistory: Array<{
      type: "list" | "sold";
      price: number | null;
      date: string;
      notes?: string;
    }>;
  };
  year: number;
  mileage: {
    value: number;
    unit: string;
  };
  status: string;
  imageIds: string[];
  images: Array<{
    _id: string;
    car_id: string;
    [key: string]: any;
  }>;
  client: string | null;
  clientInfo: {
    _id: string;
    [key: string]: any;
  } | null;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    const data = await request.json();
    console.log("Creating car with data:", JSON.stringify(data, null, 2));

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

    console.log("Created car:", JSON.stringify(car, null, 2));
    return NextResponse.json(car, { status: 201 });
  } catch (error) {
    return errorHandler(error, "Failed to create car");
  }
}

export async function GET(request: Request) {
  apiLog("Received GET request", { url: request.url });

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "48"),
      96 // Maximum page size
    );
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";

    apiLog("Request parameters", {
      page,
      pageSize,
      search,
      sort,
      filters: {
        make: searchParams.get("make"),
        minYear: searchParams.get("minYear"),
        maxYear: searchParams.get("maxYear"),
        clientId: searchParams.get("clientId"),
        minPrice: searchParams.get("minPrice"),
        maxPrice: searchParams.get("maxPrice"),
      },
    });

    // Validate page number
    if (page < 1) {
      apiLog("Invalid page number", { page }, "warn");
      return NextResponse.json(
        { error: "Invalid page number" },
        { status: 400 }
      );
    }

    // Get filter parameters
    const make = searchParams.get("make");
    const minYear = searchParams.get("minYear");
    const maxYear = searchParams.get("maxYear");
    const clientId = searchParams.get("clientId");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    let client;
    try {
      apiLog("Attempting to connect to MongoDB");
      client = await clientPromise;
      apiLog("MongoDB connection successful");
    } catch (connectionError) {
      apiLog("MongoDB connection error", { error: connectionError }, "error");
      return NextResponse.json(
        {
          error: "Database connection error",
          cars: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0,
        },
        { status: 503 }
      );
    }

    const db = client.db();
    const carsCollection = db.collection("cars");
    apiLog("Retrieved cars collection reference");

    // ADDED: Check if the collection exists and has documents
    try {
      // Use db.command instead of stats() which doesn't exist on Collection type
      const collectionStats = await db.command({ collStats: "cars" });
      apiLog("Collection stats", {
        count: collectionStats.count,
        size: collectionStats.size,
        avgObjSize: collectionStats.avgObjSize,
        storageSize: collectionStats.storageSize,
      });

      // If zero documents, do a quick sample to check schema
      if (collectionStats.count === 0) {
        apiLog("Empty collection detected - check database setup", {}, "warn");
      } else {
        // Sample a document to check schema
        const sampleDoc = await carsCollection.findOne({});
        apiLog("Sample document from collection", {
          sampleId: sampleDoc?._id ? sampleDoc._id.toString() : "none",
          hasCreatedAt: !!sampleDoc?.createdAt,
          fieldCount: sampleDoc ? Object.keys(sampleDoc).length : 0,
        });
      }
    } catch (statsError) {
      apiLog("Error checking collection stats", { error: statsError }, "error");
    }

    // Build query
    const query: any = {
      // Ensure createdAt exists for all documents in the query
      createdAt: { $exists: true },
    };

    apiLog("Building query with filter parameters", {
      make,
      minYear,
      maxYear,
      clientId,
      minPrice,
      maxPrice,
      search,
      sort,
    });

    // Add search condition if search term exists
    if (search) {
      const searchTerms = search.split(/\s+/).filter((term) => term);

      // Look for year patterns (4 digits)
      const yearTerms = searchTerms
        .filter((term) => /^\d{4}$/.test(term))
        .map((term) => parseInt(term));

      // Create regex for non-year terms
      const textTerms = searchTerms
        .filter((term) => !/^\d{4}$/.test(term))
        .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      const searchConditions = [];

      // Add text-based searches
      if (textTerms.length > 0) {
        const textRegex = { $regex: textTerms.join("|"), $options: "i" };
        searchConditions.push(
          { make: textRegex },
          { model: textRegex },
          { vin: textRegex },
          { color: textRegex },
          { "manufacturing.series": textRegex },
          { "manufacturing.trim": textRegex }
        );
      }

      // Add year-based searches
      if (yearTerms.length > 0) {
        searchConditions.push(
          ...yearTerms.map((year) => ({
            $or: [{ year: year }, { year: year.toString() }],
          }))
        );
      }

      if (searchConditions.length > 0) {
        query.$or = searchConditions;
      }
    }

    // Add make filter
    if (make) {
      query.make = make;
    }

    // Add year range filter
    if (minYear || maxYear) {
      query.year = {};
      if (minYear) {
        const minYearNum = parseInt(minYear);
        if (!isNaN(minYearNum)) {
          query.year.$gte = minYearNum;
        }
      }
      if (maxYear) {
        const maxYearNum = parseInt(maxYear);
        if (!isNaN(maxYearNum)) {
          query.year.$lte = maxYearNum;
        }
      }
      // If no valid year filters were added, remove the empty year query
      if (Object.keys(query.year).length === 0) {
        delete query.year;
      }
    }

    // Add client filter
    if (clientId) {
      try {
        query.client = new ObjectId(clientId);
        apiLog("Added client filter", {
          clientId,
          objectId: query.client.toString(),
        });
      } catch (error) {
        apiLog("Invalid client ID format", { clientId, error }, "error");
        // If the ID is invalid, return no results
        query.client = null;
      }
    }

    // Add price range filter
    if (minPrice || maxPrice) {
      query["price.listPrice"] = {};
      if (minPrice) {
        const minPriceNum = parseInt(minPrice);
        if (!isNaN(minPriceNum)) {
          query["price.listPrice"].$gte = minPriceNum;
        }
      }
      if (maxPrice) {
        const maxPriceNum = parseInt(maxPrice);
        if (!isNaN(maxPriceNum)) {
          query["price.listPrice"].$lte = maxPriceNum;
        }
      }
      // If no valid price filters were added, remove the empty price query
      if (Object.keys(query["price.listPrice"]).length === 0) {
        delete query["price.listPrice"];
      }
    }

    // Determine sort order
    const [sortField, sortDirection] = sort.split("_");
    const sortOptions: any = {};

    // Map sort fields to their database counterparts
    const sortFieldMap: { [key: string]: string } = {
      price: "price.listPrice",
      createdAt: "createdAt",
      year: "year",
      make: "make",
      model: "model",
    };

    // Get the actual database field name
    const dbSortField = sortFieldMap[sortField] || "createdAt";
    sortOptions[dbSortField] = sortDirection === "desc" ? -1 : 1;

    apiLog("Final query parameters", {
      requestedSort: sort,
      dbField: dbSortField,
      direction: sortDirection,
      finalSortOptions: sortOptions,
      query,
    });

    try {
      // Get total count for pagination
      apiLog("Counting documents matching query");
      const totalCount = await carsCollection.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
      const skip = (page - 1) * pageSize;

      apiLog("Count results", { totalCount, totalPages, skip });

      // Exit early if no documents match
      if (totalCount === 0) {
        apiLog("No matching documents found", { query }, "warn");
        return NextResponse.json({
          cars: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0,
        });
      }

      // Determine sort field and direction
      const [sortField, sortDir] = sort.split("_");
      const sortSpec: Record<string, 1 | -1> = {};
      sortSpec[sortField || "createdAt"] = sortDir === "asc" ? 1 : -1;

      // Add secondary sort for consistency
      if (sortField !== "createdAt") {
        sortSpec["createdAt"] = -1;
      }

      apiLog("Executing aggregate query", {
        matchStage: query,
        sortSpec,
        skip,
        limit: pageSize,
      });

      // Execute the query with pagination and sorting
      const cars = await carsCollection
        .aggregate([
          { $match: query },
          {
            $lookup: {
              from: "clients",
              localField: "client",
              foreignField: "_id",
              as: "clientInfo",
            },
          },
          {
            $addFields: {
              clientInfo: { $arrayElemAt: ["$clientInfo", 0] },
              imageIds: {
                $map: {
                  input: { $ifNull: ["$imageIds", []] },
                  as: "id",
                  in: { $toString: "$$id" },
                },
              },
            },
          },
          { $sort: sortSpec },
          { $skip: skip },
          { $limit: pageSize },
          {
            $project: {
              _id: { $toString: "$_id" },
              year: 1,
              make: 1,
              model: 1,
              vin: 1,
              price: 1,
              status: 1,
              mileage: 1,
              color: 1,
              description: 1,
              imageIds: 1,
              clientInfo: {
                $cond: {
                  if: { $eq: ["$clientInfo", null] },
                  then: null,
                  else: {
                    _id: { $toString: "$clientInfo._id" },
                    name: "$clientInfo.name",
                    email: "$clientInfo.email",
                    phone: "$clientInfo.phone",
                    businessType: "$clientInfo.businessType",
                  },
                },
              },
              client: { $toString: "$client" },
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ])
        .toArray();

      apiLog("Query results", {
        carsCount: cars.length,
        firstCarSample:
          cars.length > 0
            ? {
                _id: cars[0]._id,
                make: cars[0].make,
                model: cars[0].model,
                year: cars[0].year,
              }
            : "No cars found",
      });

      // NEW: Added safeguards for response data
      let validCars = cars;
      if (!validCars || !Array.isArray(validCars)) {
        apiLog(
          "Cars result is not an array",
          { carsType: typeof cars },
          "error"
        );
        validCars = [];
      }

      // Return the cars with pagination info
      const response = {
        cars: validCars,
        totalPages,
        currentPage: page,
        totalCount,
      };

      apiLog("Sending response", {
        totalCars: validCars.length,
        totalPages,
        totalCount,
        status: 200,
        responseKeys: Object.keys(response),
      });

      return NextResponse.json(response);
    } catch (queryError) {
      apiLog("Error executing cars query", { error: queryError }, "error");
      return NextResponse.json(
        {
          error: "Error querying cars",
          cars: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return errorHandler(error, "Failed to fetch cars");
  }
}
