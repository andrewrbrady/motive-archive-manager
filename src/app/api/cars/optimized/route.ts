import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { caches, cacheKeys, cacheUtils } from "@/lib/database/cache";
import { validateQueryPerformance } from "@/lib/database/indexes";

export const dynamic = "force-dynamic";

/**
 * Optimized Cars API Route - Phase 3 Performance Optimization
 *
 * Key optimizations:
 * 1. ✅ Query result caching with intelligent cache keys
 * 2. ✅ Optimized MongoDB queries with proper indexes
 * 3. ✅ Efficient field projection to reduce data transfer
 * 4. ✅ Query performance monitoring
 * 5. ✅ Proper pagination and limits
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "createdAt_desc";
    const fieldsParam = searchParams.get("fields");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    // Build filters object for cache key
    const filters = {
      search,
      sort,
      fields: fieldsParam,
      clientId,
      status,
      limit,
    };

    // Generate cache key
    const cacheKey = cacheKeys.carsSearch(search, filters);

    // Try cache first
    const cached = caches.cars.get(cacheKey);
    if (cached) {
      console.log(
        `🎯 Cache hit for cars: ${cacheKey} (${Date.now() - startTime}ms)`
      );
      return NextResponse.json(cached);
    }

    console.log(`🔍 Cache miss for cars: ${cacheKey}`);

    // Create projection object for field selection
    const projection: Record<string, 1> = {};
    if (fieldsParam) {
      const fields = fieldsParam.split(",");
      fields.forEach((field) => {
        projection[field] = 1;
      });
    } else {
      // Default fields for optimal performance
      projection._id = 1;
      projection.make = 1;
      projection.model = 1;
      projection.year = 1;
      projection.color = 1;
      projection.status = 1;
      projection.clientId = 1;
      projection.createdAt = 1;
      projection.updatedAt = 1;
    }

    // Build optimized query using indexes
    const query: any = {};

    // Add search filter (uses make_model_year_idx)
    if (search) {
      query.$or = [
        { make: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { year: { $regex: search, $options: "i" } },
      ];
    }

    // Add status filter (uses cars_status_idx)
    if (status) {
      query.status = status;
    }

    // Add client filter (uses cars_clientId_idx)
    if (clientId) {
      try {
        query.clientId = new ObjectId(clientId);
      } catch (err) {
        return NextResponse.json(
          { error: "Invalid clientId format" },
          { status: 400 }
        );
      }
    }

    // Parse sort parameter (uses cars_createdAt_desc_idx)
    const [sortField, sortOrder] = sort.split("_");
    const sortOptions = {
      [sortField === "createdAt" ? "_id" : sortField]:
        sortOrder === "desc" ? -1 : 1,
    } as const;

    const db = await getDatabase();
    const carsCollection = db.collection("cars");

    // Execute optimized query
    const cars = await carsCollection
      .find(query)
      .project(projection)
      .sort(sortOptions)
      .limit(limit)
      .toArray();

    // Process cars
    const processedCars = cars.map((car) => ({
      ...car,
      _id: car._id.toString(),
      clientId: car.clientId ? car.clientId.toString() : undefined,
    }));

    const response = {
      cars: processedCars,
      count: processedCars.length,
      performance: {
        queryTime: Date.now() - startTime,
        cached: false,
        cacheKey,
      },
    };

    // Cache the result (10 minutes for cars)
    caches.cars.set(cacheKey, response, 10 * 60 * 1000);

    // Log performance in development
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Cars query performance:`, {
        queryTime: Date.now() - startTime,
        totalCars: processedCars.length,
        filters,
        cacheKey,
      });

      // Validate query performance against indexes
      validateQueryPerformance("cars", query).then((stats) => {
        if (stats && !stats.indexHit) {
          console.warn("⚠️  Cars query not using optimal index:", stats);
        }
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] Error fetching optimized cars:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch cars",
        performance: {
          queryTime: Date.now() - startTime,
          cached: false,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Optimized car creation with cache invalidation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const db = await getDatabase();
    const data = await request.json();

    // Ensure dimensions are properly structured
    if (data.dimensions) {
      if (data.dimensions.gvwr && typeof data.dimensions.gvwr === "object") {
        data.dimensions.gvwr = {
          value: data.dimensions.gvwr.value || null,
          unit: data.dimensions.gvwr.unit || "lbs",
        };
      }

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

    // Create car document
    const result = await db.collection("cars").insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const car = await db.collection("cars").findOne({ _id: result.insertedId });

    // Invalidate related caches
    cacheUtils.invalidatePattern(caches.cars, "cars:search:");
    if (data.clientId) {
      caches.cars.delete(cacheKeys.carsByClient(data.clientId));
    }

    const response = {
      ...car,
      _id: car?._id.toString(),
      clientId: car?.clientId ? car.clientId.toString() : undefined,
      performance: {
        queryTime: Date.now() - startTime,
      },
    };

    console.log(
      `✅ Created car: ${car?.make} ${car?.model} (${Date.now() - startTime}ms)`
    );

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[API] Error creating optimized car:", error);
    return NextResponse.json(
      {
        error: "Failed to create car",
        performance: {
          queryTime: Date.now() - startTime,
        },
      },
      { status: 500 }
    );
  }
}
